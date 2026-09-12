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
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 460px;
  padding: 1rem;
  background: transparent;
  overflow: hidden;
}

.landing-tablet-showcase::before {
  content: '';
  position: absolute;
  inset: 18% 9% 16% 13%;
  background: linear-gradient(135deg, rgba(255, 253, 248, 0.24), rgba(255, 255, 255, 0));
  transform: skew(-10deg);
  pointer-events: none;
}

.landing-tablet-showcase__device {
  position: relative;
  width: min(100%, 560px);
  aspect-ratio: 16 / 10;
  padding: 0.85rem;
  border-radius: 34px;
  border: 1px solid rgba(255, 255, 255, 0.22);

  background: linear-gradient(
    145deg,
    #151f1d 0%,
    #405550 24%,
    #171d1b 52%,
    #8a6747 100%
  );

  box-shadow: 0 34px 76px rgba(21, 18, 14, 0.28);
  transform: rotate(-4deg) translateY(0);
  transition: transform 220ms ease, box-shadow 220ms ease;
}

.landing-tablet-showcase__device:hover {
  box-shadow: 0 40px 86px rgba(21, 18, 14, 0.34);
  transform: rotate(-2deg) translateY(-6px);
}

.landing-tablet-showcase__device::before {
  content: '';
  position: absolute;
  inset: 0.55rem;
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  pointer-events: none;
}

.landing-tablet-showcase__device::after {
  content: '';
  position: absolute;
  inset: 0.85rem 0.85rem auto 0.85rem;
  height: 42%;
  border-radius: 24px 24px 80px 80px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.14), transparent);
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
