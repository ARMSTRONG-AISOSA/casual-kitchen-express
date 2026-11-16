# AREAS AROUND UGBOWO, OLUKU, AND USELU

**Status:** Scouting draft, compiled on 10 November 2026 from web sources, updated with the delivery boundary, with the areas in range decided on 11 November 2026, and with the owner’s pins and Evbogida on 16 November 2026. It is a starting list to confirm on the ground, not a survey or an official map.  
**Used by:** the delivery neighbourhood list in the apps (`architecture.md`, 4.7 and 18.3), the delivery area wording in `design.md`, and the seeded demo data.

**How to read this list**
- **Confidence** shows how well the web sources support the entry: **High** (several sources agree), **Medium** (one or two sources), **Low** (a single, older, or unclear source).
- Directions and distances are not included, because the sources disagree or do not say. Check each place on a map before fixing the delivery range.
- Place names appear in different spellings online (for example Ekosodin and Ecosodi, Isihor and Isiohor).

---

## 1. Delivery boundary (decided)

| Limit | Where |
|---|---|
| **Northern limit** | **Oluku Market**, along the Benin–Lagos Road in Ovia North-East. CKE does not deliver beyond Oluku Market. |
| **City-side limit** | Uselu |
| **Kitchen** | Ugbowo, near the University of Benin |

**Notes on Oluku Market**
- It is a well-known landmark on the Benin–Lagos Road in Oluku, Ovia North-East LGA, and it appears in the Edo State list of markets.
- The Benin–Lagos Expressway divides the Oluku community into two parts (Oluku I and II). **Decided (11 November 2026): both sides of the expressway are in range, up to the market.**
- **Recent event:** the market was badly damaged by a petrol tanker fire on 15 October 2026, and news reports say the state government has promised to rebuild it. The owner confirmed on 10 November 2026 that the road is now clear.

**The owner's pins (16 November 2026):** the kitchen is at **6.400469° N, 5.608338° E** (Ugbowo). The boundary runs from the Uselu pin (6.354996° N, 5.618782° E) up both sides of the expressway to the Oluku pin (6.458759° N, 5.593531° E), through the owner's ten side points, and was widened west around Uwelu (owner: “you can decide to add Uwelu”) so its market area is in range. The 14 corners are `DELIVERY_BOUNDARY` in `packages/validation`; the API checks every new address against it, and the customer app draws it. Area pins start at the centres in section 3a.

---

## 2. Anchor point

| Item | Detail |
|---|---|
| UNIBEN main campus (Ugbowo Campus) | Ugbowo, Benin City, along the Benin–Lagos expressway (Ugbowo Lagos Road, also written as the Benin–Ore Road) |
| Approximate coordinates | 6.401° N, 5.615° E (OpenStreetMap, around the faculty buildings; corrected on 11 November 2026 from an earlier 6.3337° N, 5.6002° E, which was about 7 km off) |
| Local government area | Ovia North-East (Egor LGA is next to it, for Uselu) |

---

## 3. Areas in your delivery range

| Area | Notes | Confidence |
|---|---|---|
| **Ugbowo** | The home of the UNIBEN main campus and the University of Benin Teaching Hospital (UBTH). It is the kitchen's base, so it needs no distance estimate. | High |
| **Uselu** | Described as lying between the campus and the city. It is in Egor LGA, and many university addresses (for example the Faculty of Engineering and the Faculty of Education) use "Uselu". Places include Federal Road, Uselu and Uselu Lagos Road. Uselu Market is on Ugbowo Lagos Road. | High |
| **Uwelu** | Added 11 November 2026. The area of the Uwelu spare-parts market, just west of Uselu, off the main road (OpenStreetMap, about 6.386° N, 5.583° E). Close to the city-side limit, so the boundary pin decides. | Medium |
| **Oluku (up to Oluku Market)** | A town in Ovia North-East LGA on the Benin–Lagos expressway, with Oluku Junction and Oluku Market as well-known landmarks. One student-housing guide places it further north than the campus, with cheaper rents. Delivery stops at the market. | High (existence), Medium (position) |

### 3a. Where each area's pin starts (16 November 2026)

From OpenStreetMap (Nominatim, Photon, and the Overpass API), except where marked.

| Area | Centre | Source |
|---|---|---|
| Ugbowo | 6.40030, 5.61009 | OpenStreetMap |
| Ekosodin | 6.41668, 5.61665 | OpenStreetMap |
| BDPA estate | 6.39385, 5.60181 | **The owner’s pin** (16 November 2026), inside the boundary |
| Osasogie | 6.39250, 5.62500 | Estimate (OpenStreetMap only has an Osasogie Street in the city). The owner isn’t sure of it either (16 November 2026), so it stays an estimate; customers drag the pin to their door anyway. |
| Uselu | 6.38339, 5.61072 | OpenStreetMap (Uselu Market, a landmark, is at 6.37658, 5.63029) |
| Uwelu | 6.38613, 5.58266 | OpenStreetMap |
| **Evbogida** | 6.36693, 5.60005 | OpenStreetMap. **Added 16 November 2026** at the owner’s request for more areas between UNIBEN and Uselu: the village beside the Ogida barracks. |
| Isihor | 6.41361, 5.60403 | Photon (spelled Isiehor) |
| Idunmwowina | 6.43332, 5.59999 | OpenStreetMap |
| Iguosa | 6.43917, 5.59769 | OpenStreetMap |
| Oluku (up to Oluku Market) | 6.44967, 5.59696 | OpenStreetMap (the town) |

Looked for between UNIBEN and Uselu but left out: Okhoro, Okhokhugbo Road, and the Ogida police post are just outside the boundary; Adolor is two streets in different places; Iyowa, Ekehuan, Ugbighoko, the teaching hospital (UBTH), and Ugbowo Market aren’t on OpenStreetMap.

---

## 4. Student and residential areas near the campus

These are the places where the students and young workers you expect as customers live.

| Area | Notes | Confidence |
|---|---|---|
| **Ekosodin** | A large residential area bordering the back of the campus, the biggest student hub, with the Ekosodin Gate and an Ekosodin Market. Often described as the home of UNIBEN students. | High |
| **BDPA estate** | A more premium, quieter estate directly opposite the main gate | Medium |
| **Osasogie** | Just off the main student belt, quieter than Ekosodin and at a similar price | Medium |
| **Isihor** (also Isiohor) | Named as a popular off-campus area. It is in Ovia North-East LGA. | Medium |

---

## 5. In range up to Oluku Market (decided 11 November 2026)

The owner confirmed Isihor (section 4), Iguosa, and the villages below as in range. The northern limit still applies: any part that lies beyond Oluku Market is out of range, and the boundary pin decides.

| Area | Notes | Confidence |
|---|---|---|
| **Idunmwowina** | Added 11 November 2026. A village on the expressway between Isihor and Iguosa (OpenStreetMap, about 6.433° N, 5.600° E), well before Oluku Market. | Medium |
| **Iguosa** | Listed among the villages of Oluku, and also the name of a state housing estate (OpenStreetMap, about 6.439° N, 5.598° E) | Medium |
| **Egbaen, Okhumwun, Olefure, Uhogua** | Listed as villages under Oluku. Their exact positions were not checked. In the app they come under "Oluku (up to Oluku Market)". | Low |
| **Utekon** | Also listed under Oluku, but OpenStreetMap has an "Ekosodin/Utekon Road" at the campus, so Utekon lies near the campus and Ekosodin, not near Oluku (corrected 11 November 2026). In the app it comes under Ekosodin. | Medium |

---

## 6. Probably outside the range

| Area | Why |
|---|---|
| **Anything beyond Oluku Market** | The northern limit |
| **Aduwawa** | Named as a student area by one guide, but it is in Ikpoba-Okha LGA on the other side of the city |
| **Ekenwan Road and the Ekehuan campus** | UNIBEN's second campus is in the city, with its own separate housing market |
| **New Benin, Ikpoba Hill, Textile Mill Road** | Central or eastern parts of Benin City, away from the Ugbowo belt |

---

## 7. Landmarks for map pins and landmark text

| Landmark | Where it is |
|---|---|
| UNIBEN main gate | Ugbowo, Benin–Ore Road (Benin–Lagos expressway) |
| Ekosodin Gate | The back of the campus, Ekosodin |
| University of Benin Teaching Hospital (UBTH) | Ugbowo, on the Benin–Lagos Express Road, with addresses that also use Uselu |
| Faculty of Engineering, Uniben Road | Uselu |
| Uselu Market | Ugbowo Lagos Road, Uselu (Egor LGA) |
| Ekosodin Market | Ekosodin |
| Ugbowo Service Station (TotalEnergies, with Café Bonjour) | Ugbowo Lagos Road, Uselu |
| Oluku Junction Service Station (TotalEnergies, with Café Bonjour) | Oluku Junction, on the Benin–Sagamu (Lagos) expressway |
| **Oluku Market (boundary)** | Benin–Lagos Road, Oluku |
| John Harris Library | Inside the UNIBEN main campus |
| Nadia bakery and the Filmhouse cinema | Near the campus, opposite it |

**Added 11 November 2026, with the owner’s approval** (OpenStreetMap; coordinates are approximate and to be checked when the boundary is drawn):

| Landmark | Where it is |
|---|---|
| UBA bank | Ugbowo–Lagos Road, between Uselu and the UNIBEN main gate (about 6.389° N, 5.610° E) |
| Mount Gilead Hospital | Uselu, near the city-side end (about 6.372° N, 5.614° E) |
| Uselu motor park | The city-side end of Uselu (about 6.368° N, 5.617° E). It may sit on or just past the city-side limit. |
| Federal Neuro-Psychiatric Hospital | Known locally as the Uselu hospital (about 6.362° N, 5.621° E). Likely at or beyond the city-side limit, so a reference point rather than a delivery landmark. |
| UNIBEN Food Court (Buka) | Inside the main campus (about 6.395° N, 5.619° E). A meeting point for campus deliveries. |
| UNIBEN faculty buildings | Inside the main campus: Faculty of Education (about 6.401° N, 5.620° E), Faculty of Law (about 6.401° N, 5.622° E), Faculty of Physical Sciences (about 6.400° N, 5.615° E), and Faculty of Life Sciences (about 6.399° N, 5.615° E) |
| Benin City Bypass junction | Where the bypass meets the expressway, just north of Oluku town (about 6.458° N, 5.622° E). **Boundary reference only:** it may lie beyond Oluku Market. |

---

## 8. Proposed neighbourhood list for the apps

The customer picks one of these when adding an address, then drops a pin and adds a landmark. Anything else in the range goes under "Other area in range" with a landmark required. Addresses beyond Oluku Market are refused for delivery, and pickup is offered.

1. Ugbowo
2. Ekosodin
3. BDPA estate
4. Osasogie
5. Uselu
6. Uwelu
7. Evbogida (added 16 November 2026)
8. Isihor
9. Idunmwowina
10. Iguosa
11. Oluku (up to Oluku Market), including both sides of the expressway and the villages in section 5
12. Other area in range

---

## 9. To confirm

1. Check each place on a map and place the Oluku Market boundary pin.
2. ~~Decide whether Isihor, Iguosa, and the villages near Oluku are inside the range.~~ Done: all in range up to Oluku Market (11 November 2026).
3. Confirm the spelling to use for each name in the apps.
4. Add any streets or estates your riders already know.
5. Research more landmarks between Uselu and Oluku Market for map pins and landmark text. Each new landmark needs the owner’s approval before it is added here.

---

## 10. Sources

- Wikipedia: University of Benin (campus, coordinates), University of Benin Teaching Hospital (location), and Ovia North-East (towns and the villages listed under Oluku).
- Mushrooms.ng, "UNIBEN Off-Campus Housing — Ekosodin, Ugbowo & BDPA" (student areas, Uselu and Oluku as overflow).
- AdmitNode, University of Benin guide (BDPA, Ekosodin, Osasogie).
- EdoToday, "UNIBEN Hostel Fees and Accommodation Guide" (Ugbowo, Ekosodin, Uselu, Isihor, Aduwawa).
- Edo Property, University of Benin page (Ekosodin as the student area; Federal Road, Uselu).
- Africabz directory entries for UNIBEN (Uselu addresses and the Ekosodin Gate).
- Nigeria Housing Market postal code directory (Oluku in Ovia North-East, Uselu in Egor).
- Edo State Ministry of Budget and Economic Planning, list of markets (Oluku Market and Ekosodin Market in Ovia North-East).
- Nigeria Galleria, popular markets in Edo State (Uselu Market on Ugbowo Lagos Road).
- A study of Oluku in the journal Medicina Social (the community divided by the Lagos–Benin Expressway, with a market and three gas stations).
- News reports on the Oluku Market tanker fire of 15 October 2026: Gazette NGR, ThisDay, Blueprint, Nigerian Observer, and Legit.ng.
- TotalEnergies Nigeria, Café Bonjour promotion (the Ugbowo and Oluku Junction service stations).
- UNIBEN Campus Villa blog (2016) for older background on student areas.
- OpenStreetMap (© OpenStreetMap contributors), queried through Nominatim and the Overpass API on 11 November 2026: place positions, the UNIBEN coordinates, Idunmwowina, Uwelu, Utekon’s position, and the landmarks added in section 7. OpenStreetMap coverage north of Uselu is sparse.

Some of these are blogs and listings of mixed reliability, so treat the list as a lead to verify rather than a final answer.
