<template>
  <v-container class="practical-page" fluid>
    <div class="practical-backdrop" aria-hidden="true"></div>

    <div class="practical-shell">
      <v-card class="practical-empty-card" elevation="6">
        <div class="practical-empty-icon">
          <v-icon size="32">mdi-notebook-remove-outline</v-icon>
        </div>

        <div class="practical-eyebrow">Exercices Pratiques</div>
        <h1 class="practical-title">Aucun exercice disponible pour le moment.</h1>
        <p class="practical-subtitle">
          La bibliotheque a ete videe pour la mise en production. Cette section restera sans contenu
          jusqu'a l'ajout des premiers exercices.
        </p>
      </v-card>
    </div>
  </v-container>
</template>

<style scoped>
.practical-page {
  position: relative;
  min-height: calc(100vh - 64px);
  padding: 32px 20px 48px;
  background:
    radial-gradient(120% 120% at 10% 15%, rgba(28, 124, 125, 0.12), transparent 55%),
    radial-gradient(80% 100% at 90% 10%, rgba(230, 138, 46, 0.1), transparent 45%),
    linear-gradient(180deg, #f6f1e8 0%, #fcfaf6 100%);
}

.practical-backdrop {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(19, 58, 59, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(19, 58, 59, 0.03) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.45), transparent 85%);
}

.practical-shell {
  position: relative;
  width: min(920px, 100%);
  margin: 0 auto;
}

.practical-empty-card {
  padding: 40px 32px;
  border-radius: 30px;
  border: 1px solid rgba(19, 58, 59, 0.08);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 248, 238, 0.94));
  box-shadow: 0 24px 50px rgba(12, 31, 32, 0.12);
  text-align: center;
}

.practical-empty-icon {
  width: 72px;
  height: 72px;
  margin: 0 auto 18px;
  border-radius: 22px;
  display: grid;
  place-items: center;
  background: rgba(19, 58, 59, 0.08);
  color: #133a3b;
}

.practical-eyebrow {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(19, 58, 59, 0.08);
  color: #133a3b;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.practical-title {
  margin: 18px 0 12px;
  font-size: clamp(30px, 4vw, 46px);
  line-height: 1.05;
  color: #102829;
}

.practical-subtitle {
  max-width: 640px;
  margin: 0 auto;
  font-size: 16px;
  line-height: 1.7;
  color: rgba(16, 40, 41, 0.74);
}

@media (max-width: 760px) {
  .practical-page {
    padding: 20px 12px 40px;
  }

  .practical-empty-card {
    padding: 32px 20px;
    border-radius: 22px;
  }

  .practical-title {
    font-size: 30px;
  }
}
</style>
