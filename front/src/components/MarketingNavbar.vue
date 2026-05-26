<script setup>
import { RouterLink } from 'vue-router'
import { ROUTE_PATHS } from '@/router/paths'
import logoUrl from '@/assets/logo.png'

defineProps({
  ctaLabel: {
    type: String,
    default: 'Se connecter',
  },
  ctaTo: {
    type: String,
    default: ROUTE_PATHS.login,
  },
  navItems: {
    type: Array,
    default: () => [],
  },
})
</script>

<template>
  <v-sheet class="marketing-topbar px-3 px-sm-4 py-3" rounded="xl" elevation="0">
    <div class="d-flex align-center justify-space-between ga-3">
      <RouterLink :to="ROUTE_PATHS.landing" class="marketing-brand" aria-label="Retour au site vitrine">
        <div class="d-flex align-center ga-3 min-w-0">
          <v-avatar size="52" class="marketing-brand__avatar">
            <v-img :src="logoUrl" alt="Logo Persuade" />
          </v-avatar>

          <div class="marketing-brand__copy">
            <span>Plateforme interactive de negociation</span>
          </div>
        </div>
      </RouterLink>

      <div class="d-none d-md-flex align-center ga-2">
        <v-btn
          v-for="item in navItems"
          :key="item.href"
          :href="item.href"
          variant="text"
          class="marketing-nav-btn"
        >
          {{ item.label }}
        </v-btn>

        <v-btn :to="ctaTo" :ripple="false" rounded="pill" class="marketing-cta-btn">
          {{ ctaLabel }}
        </v-btn>
      </div>

      <div class="d-flex d-md-none">
        <v-menu location="bottom end">
          <template #activator="{ props }">
            <v-btn v-bind="props" icon variant="text" aria-label="Ouvrir le menu">
              <v-icon>mdi-menu</v-icon>
            </v-btn>
          </template>

          <v-list rounded="xl" class="marketing-mobile-menu">
            <v-list-item
              v-for="item in navItems"
              :key="item.href"
              :href="item.href"
              :title="item.label"
            />
            <v-list-item :to="ctaTo" :title="ctaLabel" />
          </v-list>
        </v-menu>
      </div>
    </div>
  </v-sheet>
</template>

<style scoped>
.marketing-topbar {
  border: 1px solid rgba(35, 71, 68, 0.18);
  background:
    linear-gradient(135deg, rgba(35, 71, 68, 0.96), rgba(47, 90, 86, 0.96)),
    #234744;
  box-shadow: 0 18px 44px rgba(35, 71, 68, 0.16);
  backdrop-filter: blur(16px);
}

.marketing-brand {
  color: inherit;
  text-decoration: none;
}

.marketing-brand__avatar {
  background: linear-gradient(145deg, #eef7f3, #fff4ee);
}

.marketing-brand__copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.marketing-brand__copy strong {
  font-size: 0.98rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #ffffff;
}

.marketing-brand__copy span {
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.82rem;
}

.marketing-nav-btn {
  min-width: 0;
  color: rgba(255, 255, 255, 0.84);
  text-transform: none;
  border-radius: 999px;
}

.marketing-nav-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.marketing-cta-btn {
  color: #fffdf8;
  background: linear-gradient(135deg, #234744, #2f5a56);
  border: 1px solid rgba(35, 71, 68, 0.12);
  text-transform: none;
  font-weight: 700;
  box-shadow: 0 12px 26px rgba(35, 71, 68, 0.12);
}

.marketing-mobile-menu {
  border: 1px solid rgba(35, 71, 68, 0.12);
  background: rgba(35, 71, 68, 0.98);
}

@media (max-width: 600px) {
  .marketing-brand__copy span {
    display: none;
  }
}
</style>
