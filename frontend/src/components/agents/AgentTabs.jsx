import styles from './Agents.module.css';

function AgentTabs({ tabs, activeTab, onChange }) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Agent list filters">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.key}
          className={`${styles.tabButton} ${activeTab === tab.key ? styles.tabActive : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default AgentTabs;

