import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react-native';

import {verifyEmployeeFace} from '../src/ai/faceMatcher';
import {faceEmbeddingGenerator} from '../src/ai/faceEmbedding';

const mockVerifyFace = jest.fn();
const mockRegisterFace = jest.fn();
const mockLogAuthAttempt = jest.fn();
const mockGetAllLogs = jest.fn();

jest.mock('../src/services/SecureStorageService', () => ({
  secureStorageService: {
    registerFace: mockRegisterFace,
    verifyFace: mockVerifyFace,
  },
}));

jest.mock('../src/services/OfflineDatabaseService', () => ({
  offlineDatabaseService: {
    getAllLogs: mockGetAllLogs,
    logAuthAttempt: mockLogAuthAttempt,
  },
}));

jest.mock('../src/components/LiveScannerPanel', () => {
  const ReactMock = require('react');
  const {Pressable, Text} = require('react-native');

  return {
    LiveScannerPanel: ({
      onLivenessComplete,
    }: {
      onLivenessComplete: (imagePath: string) => void;
    }) =>
      ReactMock.createElement(
        Pressable,
        {
          accessibilityRole: 'button',
          onPress: () => onLivenessComplete('mock://unenrolled-capture.jpg'),
        },
        ReactMock.createElement(Text, null, 'Complete mock liveness'),
      ),
  };
});

describe('unenrolled employee authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    if (typeof (global as any).resetMockDatabase === 'function') {
      (global as any).resetMockDatabase();
    }
  });

  it('returns failure without generating embeddings when no template exists', async () => {
    const generateEmbeddingSpy = jest.spyOn(
      faceEmbeddingGenerator,
      'generateEmbedding',
    );

    const result = await verifyEmployeeFace(
      'EMP404',
      'mock://unenrolled-capture.jpg',
    );

    expect(result).toMatchObject({
      success: false,
      error: 'No registered face template found for employee ID: EMP404',
    });
    expect(generateEmbeddingSpy).not.toHaveBeenCalled();
    expect((global as any).mockDbState.templates).toHaveLength(0);
  });

  it('screen flow logs a failed attempt and never auto-registers a missing employee', async () => {
    mockVerifyFace.mockResolvedValue({
      success: false,
      error: 'No registered face template found for employee ID: EMP404',
      matchTimeMs: 4,
    });
    mockLogAuthAttempt.mockResolvedValue(1);
    mockGetAllLogs.mockResolvedValue([{id: 1, logHash: 'hash-1'}]);

    const {AuthenticationScreen} = require('../src/screens/AuthenticationScreen');
    const screen = render(<AuthenticationScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('EMPLOYEE ID'), 'emp404');
    fireEvent.press(screen.getByText('Start Verification'));
    fireEvent.press(await screen.findByText('Complete mock liveness'));

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeTruthy();
    });

    expect(mockVerifyFace).toHaveBeenCalledWith(
      'EMP404',
      'mock://unenrolled-capture.jpg',
      expect.any(Number),
    );
    expect(mockRegisterFace).not.toHaveBeenCalled();
    expect(mockLogAuthAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: 'EMP404',
        authStatus: 'FAILED',
        failureReason:
          'No registered face template found for employee ID: EMP404',
      }),
    );
  });
});
