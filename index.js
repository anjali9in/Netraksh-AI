import 'react-native-get-random-values';
import {AppRegistry} from 'react-native';
import App from './src/app/App';
import {name as appName} from './app.json';
import {runBackgroundSyncTask} from './src/services/sync/backgroundSyncTask';

AppRegistry.registerComponent(appName, () => App);

AppRegistry.registerHeadlessTask('NetrakshAuthLogSync', () => runBackgroundSyncTask);
