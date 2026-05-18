const { updateElectronApp } = require('update-electron-app');
const { autoUpdater } = require('electron');

module.exports = function setupUpdates(win) {
  updateElectronApp({
    updateInterval: '1 hour',
    notifyUser: false,
    logger: { log: console.log, info: console.log, warn: console.warn, error: console.error },
  });

  const send = (payload) => win?.webContents?.send('update-status', payload);

  autoUpdater.on('checking-for-update',  ()    => send({ status: 'checking' }));
  autoUpdater.on('update-available',     ()    => send({ status: 'available' }));
  autoUpdater.on('update-not-available', ()    => send({ status: 'current' }));
  autoUpdater.on('update-downloaded',    ()    => send({ status: 'ready' }));
  autoUpdater.on('error',                (err) => send({ status: 'error', msg: err.message }));
};
