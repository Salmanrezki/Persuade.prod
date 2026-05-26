<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  detail: {
    type: String,
    default: '',
  },
  meta: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: '',
  },
  tone: {
    type: String,
    default: 'teal',
  },
  compact: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <v-sheet class="dashboard-surface-item" :class="[`dashboard-surface-item--${tone}`, compact && 'dashboard-surface-item--compact']" rounded="xl">
    <div v-if="icon" class="dashboard-surface-item__icon">
      <v-icon size="18">{{ icon }}</v-icon>
    </div>

    <div class="dashboard-surface-item__content">
      <div class="dashboard-surface-item__title">{{ title }}</div>
      <div v-if="detail" class="dashboard-surface-item__detail">{{ detail }}</div>
    </div>

    <div v-if="meta || $slots.meta" class="dashboard-surface-item__meta">
      <slot name="meta">
        {{ meta }}
      </slot>
    </div>
  </v-sheet>
</template>

<style scoped>
.dashboard-surface-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 15px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(19, 58, 59, 0.08);
}

.dashboard-surface-item--compact {
  padding: 12px 14px;
}

.dashboard-surface-item--teal {
  background: rgba(46, 75, 64, 0.05);
}

.dashboard-surface-item--gold {
  background: rgba(196, 146, 55, 0.1);
}

.dashboard-surface-item--coral {
  background: rgba(181, 93, 63, 0.08);
}

.dashboard-surface-item__icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.58);
  color: #2e4b40;
}

.dashboard-surface-item__title {
  font-size: 14px;
  font-weight: 700;
  color: #1c1a16;
}

.dashboard-surface-item__detail {
  margin-top: 4px;
  font-size: 12px;
  color: #625b53;
}

.dashboard-surface-item__meta {
  font-size: 12px;
  font-weight: 700;
  color: #1c1a16;
  white-space: nowrap;
}

@media (max-width: 960px) {
  .dashboard-surface-item {
    grid-template-columns: auto 1fr;
  }

  .dashboard-surface-item__meta {
    grid-column: 2;
    white-space: normal;
  }
}
</style>
