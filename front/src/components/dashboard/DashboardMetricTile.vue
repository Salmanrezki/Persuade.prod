<script setup>
defineProps({
  label: {
    type: String,
    required: true,
  },
  value: {
    type: [String, Number],
    required: true,
  },
  detail: {
    type: String,
    default: '',
  },
  tone: {
    type: String,
    default: 'default',
  },
  icon: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <div class="dashboard-metric-tile" :class="`dashboard-metric-tile--${tone}`">
    <div class="dashboard-metric-tile__top">
      <div class="dashboard-metric-tile__label">{{ label }}</div>
      <div v-if="icon" class="dashboard-metric-tile__icon">
        <v-icon size="16">{{ icon }}</v-icon>
      </div>
    </div>
    <div class="dashboard-metric-tile__value">{{ value }}</div>
    <div v-if="detail" class="dashboard-metric-tile__detail">{{ detail }}</div>
  </div>
</template>

<style scoped>
.dashboard-metric-tile {
  min-height: 104px;
  padding: 14px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--home-line, rgba(19, 58, 59, 0.08));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
}

.dashboard-metric-tile--teal {
  background: linear-gradient(180deg, rgba(220, 236, 230, 0.95), rgba(255, 255, 255, 0.84));
}

.dashboard-metric-tile--gold {
  background: linear-gradient(180deg, rgba(252, 242, 224, 0.96), rgba(255, 255, 255, 0.84));
}

.dashboard-metric-tile--coral {
  background: linear-gradient(180deg, rgba(254, 238, 232, 0.96), rgba(255, 255, 255, 0.84));
}

.dashboard-metric-tile__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.dashboard-metric-tile__label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(42, 36, 29, 0.54);
}

.dashboard-metric-tile__icon {
  width: 28px;
  height: 28px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--home-forest-soft, rgba(46, 75, 64, 0.08));
  color: var(--home-forest, #2e4b40);
}

.dashboard-metric-tile__value {
  margin-top: 10px;
  font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif;
  font-size: 26px;
  font-weight: 700;
  color: var(--home-ink, #1c1a16);
}

.dashboard-metric-tile__detail {
  margin-top: 6px;
  font-size: 12px;
  color: var(--home-muted, #625b53);
}
</style>
