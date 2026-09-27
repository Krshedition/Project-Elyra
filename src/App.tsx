import { useEffect } from 'react';
import { useLiveSession } from './hooks/useLiveSession';
import { AppLayout } from './components/layout/AppLayout';

function App() {
  const {
    connect,
    disconnect,
    state,
    volume,
    messages,
    sendMessage,
    emailDraft,
    currentTab,
    setCurrentTab,
    handleApproveAndSendEmail,
    handleFinishDrafting,
    handleUpdateDraft,
    handleCreateNewDraft,
    elyraState,
    tasks,
    handleTriggerTask,
    handlePauseResumeTask,
    handleRerunTask,
  } = useLiveSession();

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  const handleToggleVoice = () => {
    if (state === 'idle' || state === 'error') {
      connect();
    } else {
      disconnect();
    }
  };

  return (
    <AppLayout
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      elyraState={elyraState}
      volume={volume}
      messages={messages}
      onSendMessage={sendMessage}
      emailDraft={emailDraft}
      onUpdateDraft={handleUpdateDraft}
      onSendEmail={handleApproveAndSendEmail}
      onFinishDrafting={handleFinishDrafting}
      onCreateNewDraft={handleCreateNewDraft}
      onToggleVoice={handleToggleVoice}
      onRefreshSession={connect}
      tasks={tasks}
      onTriggerTask={handleTriggerTask}
      onPauseResumeTask={handlePauseResumeTask}
      onRerunTask={handleRerunTask}
    />
  );
}

export default App;
