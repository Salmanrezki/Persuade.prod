<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: '',
  },
  chip: {
    type: String,
    default: '',
  },
  feature: {
    type: Boolean,
    default: false,
  },
  side: {
    type: Boolean,
    default: false,
  },
  extraClass: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <v-card
    class="dashboard-section-card"
    :class="[
      feature && 'dashboard-section-card--feature',
      side && 'dashboard-section-card--side',
      extraClass,
    ]"
    elevation="0"
  >
    <div class="dashboard-section-card__header">
      <div class="dashboard-section-card__heading">
        <div class="dashboard-section-card__title">{{ title }}</div>
        <div v-if="subtitle" class="dashboard-section-card__subtitle">{{ subtitle }}</div>
      </div>

      <div class="dashboard-section-card__header-actions">
        <slot name="header-actions" />
        <v-chip v-if="chip" class="dashboard-section-card__chip" size="small" variant="flat">
          {{ chip }}
        </v-chip>
      </div>
    </div>

    <div class="dashboard-section-card__body">
      <slot />
    </div>
  </v-card>
</template>

<style scoped>
.dashboard-section-card {
  border-radius: 28px;
  padding: 24px 26px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(250, 247, 242, 0.94));
  border: 1px solid rgba(19, 58, 59, 0.08);
  box-shadow:
    0 18px 44px rgba(12, 31, 32, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(12px);
}

.dashboard-section-card--feature {
  padding: 28px;
}

.dashboard-section-card--side {
  height: 100%;
  min-height: 100%;
}

.dashboard-section-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.dashboard-section-card__heading {
  min-width: 0;
}

.dashboard-section-card__header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.dashboard-section-card__title {
  font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif;
  font-size: 23px;
  font-weight: 600;
  color: #1c1a16;
  letter-spacing: -0.03em;
}

.dashboard-section-card__subtitle {
  margin-top: 4px;
  font-size: 14px;
  color: #625b53;
}

.dashboard-section-card__chip {
  background: rgba(46, 75, 64, 0.1);
  color: #2e4b40;
  font-weight: 600;
}

.dashboard-section-card__body {
  display: grid;
  gap: 16px;
}

@media (max-width: 960px) {
  .dashboard-section-card,
  .dashboard-section-card--feature {
    padding: 20px;
  }

  .dashboard-section-card__header,
  .dashboard-section-card__header-actions {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
