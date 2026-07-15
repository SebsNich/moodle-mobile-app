import { registerRootComponent } from 'expo';
import * as WebBrowser from 'expo-web-browser';

// Maneja la redirección del flujo de OAuth en la versión web cerrando el popup
WebBrowser.maybeCompleteAuthSession();

import App from './app';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
