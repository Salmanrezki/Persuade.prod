<script setup>
import { RouterLink } from 'vue-router'
import { ROUTE_PATHS } from '@/router/paths'

const logoUrl = '/branding/Forest Green P Logo with Profile Cutouts.png'

defineProps({
  showLogo: {
    type: Boolean,
    default: true,
  },
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
        <div class="marketing-brand__inner">
          <v-img v-if="showLogo" :src="logoUrl" alt="Logo Persuade" class="marketing-brand__logo" />

          <strong class="marketing-brand__wordmark">Persuade</strong>
        </div>
      </RouterLink>

      <nav class="marketing-nav d-none d-md-flex align-center" aria-label="Navigation principale">
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
      </nav>

      <div class="d-flex d-md-none">
        <v-menu location="bottom end">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon
              variant="text"
              class="marketing-menu-btn"
              aria-label="Ouvrir le menu"
              title="Ouvrir le menu"
            >
              <span class="marketing-menu-glyph" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </v-btn>
          </template>

          <v-list rounded="xl" class="marketing-mobile-menu" aria-label="Navigation mobile">
            <v-list-subheader>Navigation</v-list-subheader>
            <v-list-item
              v-for="item in navItems"
              :key="item.href"
              :href="item.href"
              link
              :title="item.label"
            />
            <v-list-item :to="ctaTo" :title="ctaLabel" link />
          </v-list>
        </v-menu>
      </div>
    </div>

  </v-sheet>
</template>

<style scoped>
.marketing-topbar {
  border: 1px solid rgba(255, 255, 255, 0.72);
  background:
    linear-gradient(135deg, rgba(255, 253, 248, 0.92), rgba(255, 255, 255, 0.76)),
    linear-gradient(90deg, rgba(181, 93, 63, 0.1), rgba(35, 71, 68, 0.06)),
    #fffdf8;
  box-shadow:
    0 22px 54px rgba(31, 52, 47, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(24px);
}

.marketing-brand {
  color: inherit;
  text-decoration: none;
}

.marketing-brand__inner {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}

.marketing-brand__logo {
  width: 72px;
  height: 58px;
  flex: 0 0 72px;
  transition: transform 180ms ease;
}

.marketing-brand:hover .marketing-brand__logo {
  transform: translateY(-1px) scale(1.04);
}

.marketing-brand__wordmark {
  display: inline-block;
  flex-shrink: 0;
  padding-right: 0.08em;
  color: #073f36;
  background: linear-gradient(180deg, #0b5147 0%, #073b33 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-family: 'Avenir Next', Avenir, 'Arial Rounded MT Bold', Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: 2rem;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.055em;
  white-space: nowrap;
  text-rendering: geometricPrecision;
}

.marketing-nav {
  gap: 0.35rem;
  padding: 0.35rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.48);
  border: 1px solid rgba(31, 52, 47, 0.08);
}

.marketing-nav-btn {
  min-height: 40px;
  min-width: 0;
  padding: 0 0.95rem;
  color: rgba(31, 52, 47, 0.72);
  text-transform: none;
  font-weight: 750;
  border-radius: 999px;
  transition: background 180ms ease, color 180ms ease, transform 180ms ease, box-shadow 180ms ease;
}

.marketing-nav-btn:hover {
  color: #1f342f;
  background: rgba(255, 253, 248, 0.92);
  box-shadow: 0 10px 22px rgba(31, 52, 47, 0.08);
  transform: translateY(-1px);
}

.marketing-cta-btn {
  min-height: 42px;
  margin-left: 0.2rem;
  padding: 0 1.1rem;
  color: #fffdf8;
  background:
    linear-gradient(135deg, #1f342f, #2f5a56 48%, #b55d3f);
  border: 1px solid rgba(181, 93, 63, 0.16);
  text-transform: none;
  font-weight: 800;
  box-shadow: 0 14px 30px rgba(31, 52, 47, 0.18);
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.marketing-cta-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 16px 30px rgba(181, 93, 63, 0.22);
}

.marketing-mobile-menu {
  min-width: 220px;
  padding: 0.35rem;
  border: 1px solid rgba(35, 71, 68, 0.12);
  background: rgba(255, 253, 248, 0.98);
  color: #1f342f;
  box-shadow: 0 18px 40px rgba(31, 52, 47, 0.16);
}

.marketing-menu-btn {
  color: #234744 !important;
}

.marketing-menu-glyph {
  display: grid;
  gap: 5px;
  width: 25px;
}

.marketing-menu-glyph span {
  display: block;
  width: 100%;
  height: 3px;
  border-radius: 999px;
  background: currentColor;
}

@media (max-width: 600px) {
  .marketing-menu-btn {
    width: 48px;
    height: 48px;
  }

  .marketing-brand__logo {
    width: 62px;
    height: 52px;
    flex-basis: 62px;
  }

  .marketing-brand__wordmark {
    font-size: 1.65rem;
  }

  :deep(.marketing-mobile-menu .v-list-item) {
    min-height: 44px;
    border-radius: 12px;
  }

  :deep(.marketing-mobile-menu .v-list-item:hover) {
    background: rgba(35, 71, 68, 0.08);
  }
}
</style>
