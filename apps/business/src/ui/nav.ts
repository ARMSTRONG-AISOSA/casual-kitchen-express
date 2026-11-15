import { router, type Href } from "expo-router";

/**
 * Opens a main screen (a side rail item) in place of whatever is open, instead of stacking it on
 * top. Expo Router's navigate adds a new screen each time, so moving around the rail kept every
 * visited screen alive (with its photos and charts) until the tablet ran short of memory and
 * slowed down (15 November 2026). Task screens (a ticket, an order, a person) still open on top
 * of their list with router.push, so Back returns to the list.
 */
export function goTo(href: Href) {
  if (router.canDismiss()) router.dismissAll();
  router.replace(href);
}
