<script setup>
import { computed } from 'vue'
const props = defineProps({
  profile: { type: Object, default: () => ({}) },
  compact: Boolean,
})
const groups = computed(() =>
  [
    ['Spécialités', props.profile.specialties],
    ['Publics accompagnés', props.profile.audiences],
    ['Langues', props.profile.languages],
    ['Formats', props.profile.formats],
    ['Certifications déclarées', props.profile.certifications],
  ].filter(([, items]) => Array.isArray(items) && items.length),
)
</script>
<template>
  <div class="coach-public-details">
    <p v-if="profile.headline" class="headline">{{ profile.headline }}</p>
    <p
      v-if="
        profile.experienceYears !== null &&
        profile.experienceYears !== undefined
      "
      class="experience"
    >
      {{ profile.experienceYears }} an{{
        profile.experienceYears > 1 ? 's' : ''
      }}
      d’expérience en négociation
    </p>
    <p v-if="profile.bio && !compact" class="bio">{{ profile.bio }}</p>
    <div
      v-for="[label, items] in compact
        ? groups.filter(([label]) => label === 'Spécialités')
        : groups"
      :key="label"
      class="tag-group"
    >
      <h3>{{ label }}</h3>
      <div class="tags">
        <span v-for="tag in items" :key="tag">{{ tag }}</span>
      </div>
    </div>
    <div v-if="profile.experienceSummary && !compact" class="tag-group">
      <h3>Parcours professionnel</h3>
      <p class="bio">{{ profile.experienceSummary }}</p>
    </div>
  </div>
</template>
<style scoped>
.coach-public-details {
  color: #24443f;
  display: grid;
  gap: 16px;
  padding: 12px 0;
}
.headline {
  font-weight: 600;
}
.experience {
  color: #b55d3f;
  font-size: 14px;
}
.bio {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.7;
  font-size: 14px;
}
.tag-group h3 {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.tags span {
  background: #edf0e9;
  border: 1px solid #24443f15;
  border-radius: 20px;
  padding: 5px 10px;
  font-size: 12px;
  overflow-wrap: anywhere;
  max-width: 100%;
}
</style>
