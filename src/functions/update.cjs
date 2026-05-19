const { autoUpdater, app } = require('electron');

module.exports = function setupUpdates(win) {
  if (!app.isPackaged) return;

  const send = (payload) => win?.webContents?.send('update-status', payload);

  autoUpdater.on('checking-for-update',  ()    => send({ status: 'checking' }));
  autoUpdater.on('update-available',     ()    => send({ status: 'available' }));
  autoUpdater.on('update-not-available', ()    => send({ status: 'current' }));
  autoUpdater.on('update-downloaded',    ()    => send({ status: 'ready' }));
  autoUpdater.on('error',                (err) => send({ status: 'error', msg: err.message }));

  try {
    const feedURL = `https://update.electronjs.org/mthero24/pythias-electon-apps/win32-x64/${app.getVersion()}`;
    autoUpdater.setFeedURL({ url: feedURL, serverType: 'json' });
    autoUpdater.checkForUpdates();
    setInterval(() => autoUpdater.checkForUpdates(), 60 * 60 * 1000);
  } catch (err) {
    send({ status: 'error', msg: err.message });
  }
};
