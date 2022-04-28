const { ipcRenderer } = require('electron')

let Notification = function(title, ops) {
    ipcRenderer.send("notification-show", {title: title, options: ops})
}
Notification.requestPermission = () => {}
Notification.permission = "granted"
window.Notification = Notification
