<script setup>
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { ROUTE_PATHS } from '@/router/paths'
const auth = useAuthStore()
const router = useRouter()
const links = [
  ['Dashboard', ROUTE_PATHS.home],
  ['Formation', ROUTE_PATHS.courses],
  ['Exercices', ROUTE_PATHS.practicalExercises],
  ['Coaching', ROUTE_PATHS.coachCourses],
]
async function logout() {
  await auth.logout()
  router.push(ROUTE_PATHS.login)
}
</script>
<template>
  <v-app-bar class="coach-navbar" elevation="0" height="112">
    <div class="coach-navbar-inner">
      <div class="coach-navbar-brand">
        <router-link :to="ROUTE_PATHS.home"
          >PERSUADE<span>Espace apprenant</span></router-link
        >
        <v-menu location="bottom end">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              class="coach-account-button"
              :class="{
                'coach-account-button--active': [
                  ROUTE_PATHS.profile,
                  ROUTE_PATHS.preferences,
                  ROUTE_PATHS.settings,
                ].includes($route.path),
              }"
              variant="text"
              size="small"
              prepend-icon="mdi-account-circle-outline"
              append-icon="mdi-chevron-down"
              >Mon compte</v-btn
            >
          </template>
          <v-list
            class="coach-account-menu"
            aria-label="Mon compte"
            min-width="220"
          >
            <v-list-item
              :to="ROUTE_PATHS.profile"
              prepend-icon="mdi-account-outline"
              title="Mon profil"
            />
            <v-list-item
              :to="ROUTE_PATHS.preferences"
              prepend-icon="mdi-tune-variant"
              title="Mes préférences"
            />
            <v-list-item
              :to="ROUTE_PATHS.chat"
              prepend-icon="mdi-message-outline"
              :title="
                auth.chatUnreadCount
                  ? `Messages (${auth.chatUnreadCount})`
                  : 'Messages'
              "
            /><v-divider class="my-2" />
            <v-list-item :to="ROUTE_PATHS.settings" prepend-icon="mdi-cog-outline" title="Réglages" />
            <v-list-item
              prepend-icon="mdi-logout"
              title="Déconnexion"
              @click="logout"
            />
          </v-list>
        </v-menu>
      </div>
      <nav aria-label="Navigation apprenant">
        <router-link
          v-for="[label, path] in links"
          :key="path"
          :to="path"
          :class="{ selected: $route.path === path }"
          >{{ label
          }}<span
            v-if="label === 'Chat' && auth.chatUnreadCount"
            class="unread"
            >{{ auth.chatUnreadCount }}</span
          ></router-link
        >
      </nav>
    </div>
  </v-app-bar>
</template>
<style scoped>
.coach-account-button {
  text-transform: none;
  letter-spacing: 0;
}
.coach-account-button--active {
  color: #b55d3f;
  background: #b55d3f10;
}
.coach-account-menu {
  background: #fffdf8;
  color: #24443f;
  border: 1px solid #24443f20;
  border-radius: 12px !important;
}
.coach-navbar {
  background: #fffdf8 !important;
  color: #24443f !important;
  border-bottom: 1px solid #24443f20;
}
.coach-navbar-inner {
  width: min(1200px, 100%);
  margin: auto;
  padding: 8px 24px 0;
}
.coach-navbar-brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.coach-navbar-brand a {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-decoration: none;
  color: inherit;
}
.coach-navbar-brand span {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.02em;
  margin-left: 16px;
}
nav {
  display: flex;
  gap: 28px;
  overflow-x: auto;
  margin-top: 12px;
}
nav a {
  white-space: nowrap;
  padding: 10px 0 13px;
  color: #52645d;
  text-decoration: none;
  border-bottom: 3px solid transparent;
  font-size: 14px;
  font-weight: 600;
}
nav a.selected {
  color: #b55d3f;
  border-color: #b55d3f;
}
.unread {
  margin-left: 6px;
  background: #24443f;
  color: white;
  border-radius: 20px;
  padding: 2px 6px;
  font-size: 11px;
}
@media (max-width: 480px) {
  .coach-navbar-inner {
    padding-inline: 16px;
  }
  nav {
    gap: 22px;
  }
  .coach-navbar-brand span {
    display: none;
  }
}
</style>
