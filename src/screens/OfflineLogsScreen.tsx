import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {AppHeader} from '../components/AppHeader';
import {ScreenContainer} from '../components/ScreenContainer';
import {StatusBadge} from '../components/StatusBadge';
import {
  offlineDatabaseService,
  AuthLogEntry,
} from '../services/OfflineDatabaseService';
import {offlineSyncService} from '../services/OfflineSyncService';
import {normalizeApiError} from '../services/api/apiError';

type SyncNotice = {
  title: string;
  message: string;
  status: 'success' | 'warning' | 'error' | 'info';
};

export function OfflineLogsScreen(): React.JSX.Element {
  const [logs, setLogs] = useState<AuthLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuthLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'SUCCESS' | 'FAILED' | 'PENDING'
  >('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<SyncNotice | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const allLogs = await offlineDatabaseService.getAllLogs();
      setLogs(allLogs);
      applyFilters(allLogs, searchQuery, statusFilter);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = (
    allLogs: AuthLogEntry[],
    query: string,
    filter: typeof statusFilter,
  ) => {
    let result = [...allLogs];

    // Apply Search Query
    if (query.trim()) {
      result = result.filter(log =>
        log.employeeId.toLowerCase().includes(query.toLowerCase()),
      );
    }

    // Apply Status Filter
    if (filter === 'SUCCESS') {
      result = result.filter(log => log.authStatus === 'SUCCESS');
    } else if (filter === 'FAILED') {
      result = result.filter(log => log.authStatus === 'FAILED');
    } else if (filter === 'PENDING') {
      result = result.filter(log => log.syncStatus === 'PENDING');
    }

    setFilteredLogs(result);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applyFilters(logs, text, statusFilter);
  };

  const handleFilterChange = (filter: typeof statusFilter) => {
    setStatusFilter(filter);
    applyFilters(logs, searchQuery, filter);
  };

  const handleSync = async () => {
    if (pendingSyncCount === 0) {
      setSyncNotice({
        title: 'Sync Queue Empty',
        message: 'All local authentication logs are already synchronized.',
        status: 'info',
      });
      return;
    }

    setIsSyncing(true);
    setSyncNotice({
      title: 'Sync In Progress',
      message: `Uploading ${pendingSyncCount} pending log(s) to AWS.`,
      status: 'info',
    });

    try {
      const result = await offlineSyncService.syncPendingLogs();
      await fetchLogs();
      setSyncNotice({
        title:
          result.failedCount > 0 ? 'Partial Sync Complete' : 'Sync Complete',
        message:
          result.failedCount > 0
            ? `${result.syncedCount} log(s) synced. ${result.failedCount} log(s) failed and were marked for review.`
            : `${result.syncedCount} log(s) synchronized successfully.`,
        status: result.failedCount > 0 ? 'warning' : 'success',
      });
    } catch (error) {
      const apiError = normalizeApiError(error);
      setSyncNotice({
        title: apiError.isNetworkError ? 'Network Sync Failed' : 'Sync Failed',
        message: apiError.message,
        status: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePurge = async () => {
    Alert.alert(
      'Purge Sync Logs',
      'Delete only logs that have already been synchronized?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Purge',
          style: 'destructive',
          onPress: async () => {
            const count = await offlineDatabaseService.clearSyncedLogs(0);
            await fetchLogs();
            setSyncNotice({
              title: 'Purge Complete',
              message: `Deleted ${count} synchronized log(s). Pending logs were kept on device.`,
              status: 'success',
            });
          },
        },
      ],
    );
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Summary Metrics
  const totalCount = logs.length;
  const successCount = logs.filter(l => l.authStatus === 'SUCCESS').length;
  const failCount = logs.filter(l => l.authStatus === 'FAILED').length;
  const pendingSyncCount = logs.filter(l => l.syncStatus === 'PENDING').length;
  const syncedCount = logs.filter(l => l.syncStatus === 'SYNCED').length;

  return (
    <ScreenContainer contentContainerStyle={styles.container}>
      <AppHeader
        title="Offline Logs"
        subtitle="Review locally stored authentication and sync records."
        statusLabel={`${pendingSyncCount} pending sync`}
        status={pendingSyncCount > 0 ? 'warning' : 'success'}
      />

      {/* Metrics Cards */}
      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, {borderLeftColor: '#4f46e5'}]}>
          <Text style={styles.metricVal}>{totalCount}</Text>
          <Text style={styles.metricLabel}>Total Logs</Text>
        </View>
        <View
          style={[
            styles.metricCard,
            styles.metricCardWithMargin,
            {borderLeftColor: '#10b981'},
          ]}
        >
          <Text style={[styles.metricVal, {color: '#10b981'}]}>
            {successCount}
          </Text>
          <Text style={styles.metricLabel}>Passed</Text>
        </View>
        <View
          style={[
            styles.metricCard,
            styles.metricCardWithMargin,
            {borderLeftColor: '#f43f5e'},
          ]}
        >
          <Text style={[styles.metricVal, {color: '#f43f5e'}]}>
            {failCount}
          </Text>
          <Text style={styles.metricLabel}>Failed</Text>
        </View>
        <View
          style={[
            styles.metricCard,
            styles.metricCardWithMargin,
            {borderLeftColor: '#3b82f6'},
          ]}
        >
          <Text style={[styles.metricVal, {color: '#3b82f6'}]}>
            {pendingSyncCount}
          </Text>
          <Text style={styles.metricLabel}>Pending</Text>
        </View>
      </View>

      {/* Sync and Purge actions */}
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity
          onPress={handleSync}
          style={[
            styles.actionBtn,
            styles.syncBtn,
            isSyncing && styles.actionBtnDisabled,
          ]}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.btnText}>
              Sync Pending Logs ({pendingSyncCount})
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handlePurge}
          style={[
            styles.actionBtn,
            styles.purgeBtn,
            (isSyncing || syncedCount === 0) && styles.actionBtnDisabled,
          ]}
          disabled={isSyncing || syncedCount === 0}
        >
          <Text style={styles.btnText}>Purge Synced</Text>
        </TouchableOpacity>
      </View>

      {syncNotice ? (
        <View style={styles.syncNoticeCard}>
          <View style={styles.syncNoticeHeader}>
            <Text style={styles.syncNoticeTitle}>{syncNotice.title}</Text>
            <StatusBadge
              compact
              label={syncNotice.status.toUpperCase()}
              status={syncNotice.status}
            />
          </View>
          <Text style={styles.syncNoticeText}>{syncNotice.message}</Text>
        </View>
      ) : null}

      {/* Filters & Search */}
      <View style={styles.searchFilterCard}>
        <TextInput
          onChangeText={handleSearch}
          placeholder="Search by Employee ID..."
          placeholderTextColor="#94a3b8"
          style={styles.searchInput}
          value={searchQuery}
        />

        <View style={styles.filterBar}>
          {(['ALL', 'SUCCESS', 'FAILED', 'PENDING'] as const).map(f => (
            <TouchableOpacity
              key={f}
              onPress={() => handleFilterChange(f)}
              style={[
                styles.filterTab,
                statusFilter === f && styles.activeFilterTab,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  statusFilter === f && styles.activeFilterText,
                ]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Logs List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color="#6366f1" size="large" />
          <Text style={styles.infoText}>Loading database records...</Text>
        </View>
      ) : filteredLogs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No matching logs found</Text>
          <Text style={styles.emptySubtext}>
            Logs are saved locally whenever face recognition is run.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredLogs}
          keyExtractor={(item, index) =>
            item.id?.toString() || index.toString()
          }
          scrollEnabled={false} // Nesting FlatList inside ScreenContainer ScrollView
          renderItem={({item}) => {
            const isIntegrityOk =
              offlineDatabaseService.verifyLogIntegrity(item);

            return (
              <View style={styles.logCard}>
                <View style={styles.logHeader}>
                  <View>
                    <Text style={styles.employeeId}>{item.employeeId}</Text>
                    <Text style={styles.timestamp}>
                      {new Date(item.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.badgesCol}>
                    <StatusBadge
                      label={item.authStatus}
                      status={
                        item.authStatus === 'SUCCESS' ? 'success' : 'error'
                      }
                    />
                    <View style={styles.badgeItem}>
                      <StatusBadge
                        label={item.syncStatus}
                        status={
                          item.syncStatus === 'SYNCED' ? 'info' : 'warning'
                        }
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.logDetails}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Challenge: </Text>
                    <Text style={styles.detailVal}>
                      {item.challengeType} (Passed)
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Score: </Text>
                    <Text style={styles.detailVal}>
                      {item.similarityScore !== null
                        ? item.similarityScore.toFixed(4)
                        : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Model: </Text>
                    <Text style={styles.detailVal}>{item.modelVersion}</Text>
                  </View>
                  {item.failureReason ? (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Reason: </Text>
                      <Text style={[styles.detailVal, {color: '#ef4444'}]}>
                        {item.failureReason}
                      </Text>
                    </View>
                  ) : null}
                  {item.latitude !== null && item.longitude !== null ? (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>GPS: </Text>
                      <Text style={styles.detailVal}>
                        {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
                      </Text>
                    </View>
                  ) : null}
                  {item.ipAddress ? (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>IP: </Text>
                      <Text style={styles.detailVal}>{item.ipAddress}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Dynamic Integrity Check */}
                <View style={styles.integrityBar}>
                  <Text style={styles.integrityLabel}>
                    Log Integrity Check:
                  </Text>
                  <Text
                    style={[
                      styles.integrityStatus,
                      {color: isIntegrityOk ? '#10b981' : '#f43f5e'},
                    ]}
                  >
                    {isIntegrityOk
                      ? '● Verified (SHA-256 Valid)'
                      : '▲ TAMPERED / CORRUPT'}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 32,
  },
  metricsRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricCardWithMargin: {
    marginLeft: 8,
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDisabled: {
    opacity: 0.55,
  },
  syncBtn: {
    backgroundColor: '#4f46e5',
  },
  purgeBtn: {
    backgroundColor: '#dc2626',
    marginLeft: 10,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  searchFilterCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    padding: 12,
  },
  syncNoticeCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    padding: 12,
  },
  syncNoticeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  syncNoticeText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  syncNoticeTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
  },
  searchInput: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 14,
    paddingHorizontal: 12,
    height: 40,
  },
  filterBar: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    marginTop: 12,
    padding: 2,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  activeFilterTab: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  activeFilterText: {
    color: '#4f46e5',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 16,
  },
  infoText: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 180,
    padding: 24,
  },
  emptyText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '700',
  },
  emptySubtext: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  logCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomColor: '#f1f5f9',
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  employeeId: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  timestamp: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  badgesCol: {
    alignItems: 'flex-end',
  },
  badgeItem: {
    marginTop: 4,
  },
  logDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 8,
    marginRight: 12,
  },
  detailLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  detailVal: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  integrityBar: {
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderColor: '#edf2f7',
    borderWidth: 1,
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  integrityLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  integrityStatus: {
    fontSize: 11,
    fontWeight: '800',
  },
});
