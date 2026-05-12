<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useNewsFeed } from '@/composables/useNewsFeed'

const props = defineProps({
  variant: {
    type: String,
    default: 'dashboard',
  },
})

const router = useRouter()
const { items, loading, error, refresh } = useNewsFeed()

const activeIndex = ref(0)
const compact = computed(() => props.variant === 'sidebar')
const visibleItems = computed(() => items.value.slice(0, compact.value ? 4 : 6))
const mediaAspectRatio = computed(() => (compact.value ? 1.9 : 2.15))
const title = computed(() => (compact.value ? 'A la une' : 'Nouveautes a explorer'))
const subtitle = computed(() =>
  compact.value
    ? 'Cours pre-enregistres, coachings et sessions a surveiller.'
    : 'Les nouveaux contenus a voir directement sur la plateforme.'
)

let autoplayTimer = null

const nextSlide = () => {
  if (!visibleItems.value.length) return
  activeIndex.value = (activeIndex.value + 1) % visibleItems.value.length
}

const previousSlide = () => {
  if (!visibleItems.value.length) return
  activeIndex.value = (activeIndex.value - 1 + visibleItems.value.length) % visibleItems.value.length
}

const restartAutoplay = () => {
  if (autoplayTimer) {
    window.clearInterval(autoplayTimer)
    autoplayTimer = null
  }

  if (typeof window === 'undefined' || visibleItems.value.length <= 1) return
  autoplayTimer = window.setInterval(nextSlide, compact.value ? 5000 : 6500)
}

const openItem = (item) => {
  if (!item?.route) return
  router.push(item.route)
}

watch(
  () => visibleItems.value.length,
  (length) => {
    if (!length) {
      activeIndex.value = 0
    } else if (activeIndex.value >= length) {
      activeIndex.value = 0
    }

    restartAutoplay()
  },
  { immediate: true }
)

watch(
  () => props.variant,
  () => {
    activeIndex.value = 0
    restartAutoplay()
  }
)

onMounted(() => {
  refresh()
})

onBeforeUnmount(() => {
  if (!autoplayTimer) return
  window.clearInterval(autoplayTimer)
  autoplayTimer = null
})
</script>

<template>
  <section
    class="news-carousel"
    :class="[`news-carousel--${variant}`]"
  >
    <div class="news-carousel__header">
      <div>
        <div class="news-carousel__eyebrow">Actualites</div>
        <div class="news-carousel__title">{{ title }}</div>
        <div class="news-carousel__subtitle">{{ subtitle }}</div>
      </div>

      <div v-if="visibleItems.length > 1" class="news-carousel__controls">
        <v-btn
          icon="mdi-chevron-left"
          size="x-small"
          variant="text"
          class="news-carousel__control"
          @click="previousSlide"
        />
        <v-btn
          icon="mdi-chevron-right"
          size="x-small"
          variant="text"
          class="news-carousel__control"
          @click="nextSlide"
        />
      </div>
    </div>

    <div v-if="loading && !visibleItems.length" class="news-carousel__state">
      Chargement des actualites...
    </div>

    <div v-else-if="visibleItems.length" class="news-carousel__viewport">
      <v-window
        v-model="activeIndex"
        :show-arrows="false"
        class="news-carousel__window"
        mandatory
      >
        <v-window-item
          v-for="(item, index) in visibleItems"
          :key="item.id"
          :value="index"
        >
          <button
            type="button"
            class="news-carousel__slide"
            :class="[`news-carousel__slide--${item.tone}`]"
            @click="openItem(item)"
          >
            <div class="news-carousel__slide-top">
              <v-chip size="small" class="news-carousel__chip" variant="flat">
                {{ item.label }}
              </v-chip>
              <div class="news-carousel__icon-wrap">
                <v-icon size="18">{{ item.icon }}</v-icon>
              </div>
            </div>

            <div v-if="item.image" class="news-carousel__media">
              <v-img
                :src="item.image"
                :alt="item.title"
                :aspect-ratio="mediaAspectRatio"
                class="news-carousel__image"
                cover
                loading="lazy"
                gradient="to bottom, rgba(8, 23, 23, 0.06), rgba(8, 23, 23, 0.32)"
              >
                <template #placeholder>
                  <div class="news-carousel__media-placeholder"></div>
                </template>
                <template #error>
                  <div class="news-carousel__media-fallback">
                    <v-icon size="22">mdi-image-off-outline</v-icon>
                  </div>
                </template>
              </v-img>
            </div>

            <div class="news-carousel__slide-body">
              <div class="news-carousel__item-title">{{ item.title }}</div>
              <div class="news-carousel__item-subtitle">{{ item.subtitle }}</div>
            </div>

            <div class="news-carousel__slide-footer">
              <span class="news-carousel__meta">{{ item.meta }}</span>
              <span class="news-carousel__cta">{{ item.cta || 'Voir' }}</span>
            </div>
          </button>
        </v-window-item>
      </v-window>

      <div v-if="visibleItems.length > 1" class="news-carousel__dots">
        <button
          v-for="(item, index) in visibleItems"
          :key="`${item.id}-dot`"
          type="button"
          class="news-carousel__dot"
          :class="{ 'news-carousel__dot--active': index === activeIndex }"
          @click="activeIndex = index"
        ></button>
      </div>
    </div>

    <div v-else class="news-carousel__state">
      {{ error || 'Aucune actualite disponible pour le moment.' }}
    </div>
  </section>
</template>

<style scoped>
.news-carousel {
  border-radius: 26px;
  overflow: hidden;
}

.news-carousel--dashboard {
  padding: 22px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(19, 58, 59, 0.08);
  box-shadow: none;
}

.news-carousel--sidebar {
  padding: 14px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.03)),
    rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: none;
}

.news-carousel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.news-carousel__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.news-carousel--dashboard .news-carousel__eyebrow {
  color: rgba(19, 58, 59, 0.5);
}

.news-carousel--sidebar .news-carousel__eyebrow {
  color: rgba(245, 239, 230, 0.42);
}

.news-carousel__title {
  margin-top: 6px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 20px;
  font-weight: 700;
}

.news-carousel--dashboard .news-carousel__title {
  color: #133a3b;
}

.news-carousel--sidebar .news-carousel__title {
  color: #fff8f1;
  font-size: 15px;
}

.news-carousel__subtitle {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.45;
}

.news-carousel--dashboard .news-carousel__subtitle {
  color: rgba(19, 58, 59, 0.64);
}

.news-carousel--sidebar .news-carousel__subtitle {
  color: rgba(245, 239, 230, 0.62);
  font-size: 11px;
}

.news-carousel__controls {
  display: inline-flex;
  gap: 6px;
}

.news-carousel__control {
  border-radius: 12px;
}

.news-carousel--dashboard .news-carousel__control {
  background: rgba(19, 58, 59, 0.06);
  color: #133a3b;
}

.news-carousel--sidebar .news-carousel__control {
  background: rgba(255, 255, 255, 0.08);
  color: #fff8f1;
}

.news-carousel__state {
  min-height: 136px;
  display: grid;
  place-items: center;
  padding: 18px;
  border-radius: 20px;
  text-align: center;
  font-size: 13px;
}

.news-carousel--dashboard .news-carousel__state {
  background: rgba(19, 58, 59, 0.04);
  color: rgba(19, 58, 59, 0.66);
}

.news-carousel--sidebar .news-carousel__state {
  min-height: 108px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(245, 239, 230, 0.72);
}

.news-carousel__window {
  overflow: visible;
}

.news-carousel__slide {
  width: 100%;
  min-height: 182px;
  border: 0;
  border-radius: 22px;
  padding: 16px;
  font-family: inherit;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-align: left;
  color: inherit;
  cursor: pointer;
  appearance: none;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease;
}

.news-carousel--sidebar .news-carousel__slide {
  min-height: 136px;
  padding: 12px;
}

.news-carousel__slide:hover {
  transform: translateY(-2px);
}

.news-carousel__slide--gold {
  background:
    radial-gradient(circle at top right, rgba(245, 191, 71, 0.24), transparent 40%),
    linear-gradient(145deg, rgba(255, 248, 233, 0.98), rgba(250, 239, 212, 0.98));
  color: #74420d;
  border: 1px solid rgba(158, 106, 28, 0.14);
  box-shadow: none;
}

.news-carousel__slide--teal {
  background:
    radial-gradient(circle at top right, rgba(28, 124, 125, 0.22), transparent 40%),
    linear-gradient(145deg, rgba(230, 246, 246, 0.98), rgba(214, 239, 232, 0.98));
  color: #0f4f50;
  border: 1px solid rgba(20, 91, 92, 0.14);
  box-shadow: none;
}

.news-carousel__slide--coral {
  background:
    radial-gradient(circle at top right, rgba(240, 90, 40, 0.22), transparent 40%),
    linear-gradient(145deg, rgba(255, 239, 231, 0.98), rgba(255, 231, 223, 0.98));
  color: #7c3219;
  border: 1px solid rgba(160, 74, 43, 0.14);
  box-shadow: none;
}

.news-carousel__slide-top,
.news-carousel__slide-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.news-carousel__chip {
  font-weight: 700;
}

.news-carousel__icon-wrap {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.46);
}

.news-carousel__slide-body {
  margin: 14px 0;
}

.news-carousel__media {
  width: 100%;
  margin-top: 14px;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(226, 234, 232, 0.9), rgba(205, 218, 215, 0.92));
}

.news-carousel--sidebar .news-carousel__media {
  margin-top: 10px;
}

.news-carousel__image {
  display: block;
}

.news-carousel__media-placeholder,
.news-carousel__media-fallback {
  min-height: 78px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.news-carousel__media-placeholder {
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.54), rgba(255, 255, 255, 0.18)),
    linear-gradient(180deg, rgba(16, 52, 53, 0.12), rgba(16, 52, 53, 0.2));
  background-size: 220% 100%;
  animation: news-carousel-shimmer 1.4s ease-in-out infinite;
}

.news-carousel__media-fallback {
  color: rgba(19, 58, 59, 0.46);
  background: linear-gradient(180deg, rgba(244, 248, 247, 0.96), rgba(230, 237, 235, 0.96));
}

.news-carousel__item-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
}

.news-carousel--sidebar .news-carousel__item-title {
  font-size: 14px;
}

.news-carousel__item-subtitle {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.5;
  opacity: 0.84;
}

.news-carousel--sidebar .news-carousel__item-subtitle {
  font-size: 11px;
  margin-top: 6px;
}

@keyframes news-carousel-shimmer {
  0% {
    background-position: 100% 0;
  }

  100% {
    background-position: -100% 0;
  }
}

.news-carousel__meta {
  font-size: 12px;
  opacity: 0.76;
}

.news-carousel--sidebar .news-carousel__meta,
.news-carousel--sidebar .news-carousel__cta {
  font-size: 11px;
}

.news-carousel__cta {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.news-carousel__dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 14px;
}

.news-carousel__dot {
  width: 8px;
  height: 8px;
  border: 0;
  padding: 0;
  border-radius: 999px;
  background: rgba(19, 58, 59, 0.18);
}

.news-carousel--sidebar .news-carousel__dot {
  background: rgba(255, 255, 255, 0.18);
}

.news-carousel__dot--active {
  width: 24px;
  background: #1c7c7d;
}

.news-carousel--sidebar .news-carousel__dot--active {
  background: #f5bf47;
}
</style>
