export const COACH_JOURNEY_UPDATED = 'persuade:coach-journey-updated'
export const notifyCoachJourneyUpdated = () => {
  window.dispatchEvent(new Event(COACH_JOURNEY_UPDATED))
}
