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
  pythonExecute(method: string, params: any = {}) {
    return ipcRenderer.invoke('python-execute', method, params)
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
  browserNavigate(url: string, newTab: boolean = false) {
    return ipcRenderer.invoke('browser:navigate', { url, newTab })
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
  browserClickText(text: string) {
    return ipcRenderer.invoke('browser:clickText', text)
  },
  browserTypeInput(selector: string | undefined, text: string, pressEnter: boolean) {
    return ipcRenderer.invoke('browser:typeInput', { selector, text, pressEnter })
  },
  browserClickVideo() {
    return ipcRenderer.invoke('browser:clickVideo')
  },
  browserScroll(direction: 'up' | 'down' | 'top' | 'bottom') {
    return ipcRenderer.invoke('browser:scroll', direction)
  },
  browserAnalyzePage() {
    return ipcRenderer.invoke('browser:analyzePage')
  },
  browserClickElement(id: number) {
    return ipcRenderer.invoke('browser:clickElement', id)
  },
  browserFillForm(fields: {id: number, text: string}[]) {
    return ipcRenderer.invoke('browser:fillForm', fields)
  },
  browserCloseTab(target?: string | number) {
    return ipcRenderer.invoke('browser:closeTab', target)
  },
  browserPressKey(key: string) {
    return ipcRenderer.invoke('browser:pressKey', key)
  }
})
