import { ipcRenderer, contextBridge } from 'electron'

contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
  log(msg: any) {
    return ipcRenderer.send('log', msg)
  },
  openExternal(url: string) {
    return ipcRenderer.invoke('open-external', url)
  },
  desktopAction(actionName: string, args: any = {}) {
    return ipcRenderer.invoke('desktop-action', actionName, args)
  },
  getScreenSource() {
    return ipcRenderer.invoke('get-screen-source')
  },
  getSystemContext() {
    return ipcRenderer.invoke('get-system-context')
  },
  searchMemory(query: string) {
    return ipcRenderer.invoke('search-memory', query)
  },
  saveSessionDigest(payload: any) {
    return ipcRenderer.invoke('save-session-digest', payload)
  },
  getAllFactsDetailed() {
    return ipcRenderer.invoke('get-all-facts-detailed')
  },
  deleteFact(key: string) {
    return ipcRenderer.invoke('delete-fact', key)
  },
  addFactManual(payload: any) {
    return ipcRenderer.invoke('add-fact-manual', payload)
  },
  updateFactManual(payload: any) {
    return ipcRenderer.invoke('update-fact-manual', payload)
  },
  setWindowMode(mode: 'compact' | 'expanded') {
    return ipcRenderer.send('set-window-mode', mode)
  },
  browserNavigate(url: string, newTab: boolean = false, tabId?: number | string) {
    return ipcRenderer.invoke('browser:navigate', { url, newTab, tabId })
  },
  browserNewTab(url?: string) {
    return ipcRenderer.invoke('browser:newTab', url)
  },
  browserListTabs() {
    return ipcRenderer.invoke('browser:listTabs')
  },
  browserSwitchTab(target: string | number) {
    return ipcRenderer.invoke('browser:switchTab', target)
  },
  browserClickText(text: string, tabId?: number | string) {
    return ipcRenderer.invoke('browser:clickText', { text, tabId })
  },
  browserTypeInput(selector: string | undefined, text: string, pressEnter: boolean, tabId?: number | string) {
    return ipcRenderer.invoke('browser:typeInput', { selector, text, pressEnter, tabId })
  },
  browserClickVideo(tabId?: number | string) {
    return ipcRenderer.invoke('browser:clickVideo', tabId)
  },
  browserScroll(direction: 'up' | 'down' | 'top' | 'bottom', tabId?: number | string) {
    return ipcRenderer.invoke('browser:scroll', { direction, tabId })
  },
  browserAnalyzePage(tabId?: number | string) {
    return ipcRenderer.invoke('browser:analyzePage', tabId)
  },
  browserClickElement(id: number, tabId?: number | string) {
    return ipcRenderer.invoke('browser:clickElement', { id, tabId })
  },
  browserFillForm(fields: {id: number, text: string}[], tabId?: number | string) {
    return ipcRenderer.invoke('browser:fillForm', { fields, tabId })
  },
  browserCloseTab(target?: string | number) {
    return ipcRenderer.invoke('browser:closeTab', target)
  },
  browserPressKey(key: string, tabId?: number | string) {
    return ipcRenderer.invoke('browser:pressKey', { key, tabId })
  },
  sendEmail(options: { to: string; subject: string; body: string; isHtml?: boolean }) {
    return ipcRenderer.invoke('email:send', options)
  },
  verifyEmailConfig() {
    return ipcRenderer.invoke('email:verifyConfig')
  },
  getEmailConfig() {
    return ipcRenderer.invoke('email:getConfig')
  },
  connectGoogle(payload: { email: string; appPassword: string; displayName?: string }) {
    return ipcRenderer.invoke('email:connectGoogle', payload)
  },
  disconnectGoogle() {
    return ipcRenderer.invoke('email:disconnectGoogle')
  },
  openGoogleAppPasswords() {
    return ipcRenderer.invoke('email:openGoogleAppPasswords')
  },
  calendarCreateEvent(payload: { title: string; startTime: string; endTime?: string; description?: string; attendees?: string; reminderMinutes?: number }) {
    return ipcRenderer.invoke('calendar:createEvent', payload)
  },
  calendarListEvents(options?: { dateFilter?: 'today' | 'upcoming' | 'all'; limit?: number }) {
    return ipcRenderer.invoke('calendar:listEvents', options)
  },
  calendarDeleteEvent(target: string | number) {
    return ipcRenderer.invoke('calendar:deleteEvent', target)
  },
  dataSearchWeb(query: string) {
    return ipcRenderer.invoke('data:searchWeb', query)
  },
  dataFetchWeather(city?: string) {
    return ipcRenderer.invoke('data:fetchWeather', city)
  },
  dataFetchUrlContent(url: string) {
    return ipcRenderer.invoke('data:fetchUrlContent', url)
  },
  dataFetchCrypto(symbol: string) {
    return ipcRenderer.invoke('data:fetchCrypto', symbol)
  },
  n8nTriggerWorkflow(payload: { workflowName: string; payload: Record<string, any> }) {
    return ipcRenderer.invoke('n8n:triggerWorkflow', payload)
  },
  n8nCheckHealth() {
    return ipcRenderer.invoke('n8n:checkHealth')
  },
  windowMinimize() {
    ipcRenderer.send('window:minimize')
  },
  windowMaximize() {
    ipcRenderer.send('window:maximize')
  },
  windowClose() {
    ipcRenderer.send('window:close')
  },
  isWindowMaximized() {
    return ipcRenderer.invoke('window:isMaximized')
  }
})
