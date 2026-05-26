<template>
  <div class="landing-tablet-showcase">
    <div
      class="landing-tablet-showcase__device"
      aria-label="Apercu du dashboard Persuade sur tablette"
    >
      <div class="landing-tablet-showcase__camera" aria-hidden="true"></div>

      <div class="landing-tablet-showcase__screen">
        <v-img
          src="/landing/Courpreenregistrer.png"
          alt="Apercu du dashboard Persuade"
          contain
          class="landing-tablet-showcase__image"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.landing-tablet-showcase {
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 460px;
  padding: 1rem;
  background: #ffffff;
  overflow: hidden;
}

.landing-tablet-showcase__device {
  position: relative;
  width: min(100%, 560px);
  aspect-ratio: 16 / 10;
  padding: 0.85rem;
  border-radius: 34px;
  border: 1px solid rgba(19, 18, 16, 0.16);

  background: linear-gradient(
    145deg,
    #26231f 0%,
    #575048 24%,
    #1d1a17 52%,
    #4d463f 100%
  );

  box-shadow: 0 24px 56px rgba(21, 18, 14, 0.2);
  transform: rotate(-4deg);
}

.landing-tablet-showcase__device::before {
  content: '';
  position: absolute;
  inset: 0.55rem;
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  pointer-events: none;
}

.landing-tablet-showcase__camera {
  position: absolute;
  top: 0.7rem;
  left: 50%;
  z-index: 2;
  width: 0.58rem;
  height: 0.58rem;
  border-radius: 999px;

  background: radial-gradient(
    circle at 35% 35%,
    #77818a,
    #101113 58%,
    #050607 100%
  );

  box-shadow: 0 0 0 0.14rem rgba(255, 255, 255, 0.05);
  transform: translateX(-50%);
}

.landing-tablet-showcase__screen {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 24px;
  background: #f6efe8;

  /* moins d'espace vertical */
  padding: 4px 10px;
}

.landing-tablet-showcase__image {
  width: 100%;
  height: 100%;
}

.landing-tablet-showcase__image :deep(.v-img__img) {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  transform: scale(1);
}

@media (max-width: 600px) {
  .landing-tablet-showcase {
    min-height: 340px;
    padding: 0.5rem;
  }

  .landing-tablet-showcase__device {
    width: min(100%, 320px);
    padding: 0.6rem;
    border-radius: 24px;
    transform: rotate(-3deg);
  }

  .landing-tablet-showcase__device::before {
    border-radius: 18px;
  }

  .landing-tablet-showcase__screen {
    border-radius: 16px;
    padding: 2px 6px;
  }
}
</style>