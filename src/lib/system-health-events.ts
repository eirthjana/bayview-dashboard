/**
 * The System Status badge in the dashboard header polls /api/health on a timer.
 * A poll interval is fine for spotting something that broke on its own, but not
 * for a change the admin just made themselves — toggling AI off and watching the
 * badge stay green for another minute reads like the toggle did not work.
 *
 * Any screen that changes something the badge reports should fire this event
 * right after the write lands, so the badge re-checks immediately.
 */
export const SYSTEM_HEALTH_REFRESH = "bayview:system-health-refresh";

export function requestSystemHealthRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SYSTEM_HEALTH_REFRESH));
}
