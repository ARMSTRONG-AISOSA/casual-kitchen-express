import { router, type Href } from "expo-router";

/**
 * Goes back to one of the tabs (Menu, Orders, Profile, More) by closing the screens open over
 * them and switching tab. Replacing a screen with a tab route opened a whole new set of tabs
 * each time, so going between Order tracking and Orders kept piling them up (15 November 2026:
 * six trips took 14 back presses to leave the app, and memory kept growing).
 */
export function toTab(href: Href) {
  if (router.canDismiss()) router.dismissAll();
  router.navigate(href);
}
