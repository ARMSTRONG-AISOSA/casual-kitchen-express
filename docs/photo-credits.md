# CKE Photo Credits

**Last updated:** 12 November 2026

The menu photos used in the apps (and later the website), with where each came from, as the brand document asks (`Casual-Kitchen-Express.md`, Food Imagery). The customer app shows the same list under More, Photo credits. The files are in `apps/api/seed-media/menu/`, and `credits.json` there holds the same details for the seed script.

**How they were chosen (12 November 2026):** searched Wikimedia Commons and Openverse (which includes Flickr) for each dish, kept only licences that allow commercial use and changes, rejected photos that didn’t match the dish or showed brand logos, and checked each one by eye. Each photo was cropped to 4:3, resized to at most 1200 px on the longest edge, and saved as WebP at quality 78 (all under 250 KB, most under 130 KB), with location and camera data removed (`architecture.md` 8.1). CC BY-SA photos stay under CC BY-SA after these changes.

**Made with Gemini (12 November 2026):** no good free photo was found for the Office Lunch Combo, and the Yoghurt drink, Moi moi, and Home Plate photos were weak, so the owner made these four with Google Gemini, following the brand document’s photography direction and AI fallback rules (natural light, real portions, no text or logos). They are CKE’s own photos, credited “Photo by Casual Kitchen Express (made with Gemini)”, and ship with the app’s starting data (not marked as demo).

| Dish | File | Author | Licence | Source |
|---|---|---|---|---|
| Beef | `beef.webp` | vauvau | CC BY 2.0 | https://www.flickr.com/photos/98193606@N00/4311612078 |
| Bottled water | `water.webp` | Creative Tools | CC BY 2.0 | https://www.flickr.com/photos/33907867@N02/4332092657 |
| Chicken | `chicken.webp` | Zahraswaty | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Fried_chicken_in_Northern_Nigeria.jpg |
| Classic Jollof Combo | `classic-combo.webp` | Teame01 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:WLA2025-Osun012.jpg |
| Coleslaw | `coleslaw.webp` | Stuart Spivack (Flickr), modified on Wikimedia Commons | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:Bowl%27o%27Coleslaw_modified.jpg |
| Doughnut | `doughnut.webp` | Willis Lam | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:Golden_Donut_Cinnamon_Sugar_Doughnut_(30801404415).jpg |
| Eba (extra) | `eba.webp` | Major Lyte | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Garri_(Eba)_and_Vegetable_soup.jpg |
| Efo riro | `efo-riro.webp` | Bukky658 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Efo_riro.jpg |
| Egusi | `egusi.webp` | Bukky658 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Egusi_soup_with_ponmo_and_beef.jpg |
| Fish | `fish.webp` | Muktee1494 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Fried_fish_ready_3.jpg |
| Fried plantain | `plantain.webp` | Setor33 | CC0 | https://commons.wikimedia.org/wiki/File:Dodo_fried.jpg |
| Fried rice | `fried.webp` | Bukky658 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Fried_rice_and_chicken_garnished_with_sweet_corn,_carrot_and_green_peas.jpg |
| Home Plate | `home-plate.webp` | Casual Kitchen Express (made with Gemini) | CKE’s own | — |
| Jollof rice | `jollof.webp` | Halima Waziri | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Nigerian_jollof_rice.jpg |
| Office Lunch Combo | `office-lunch-combo.webp` | Casual Kitchen Express (made with Gemini) | CKE’s own | — |
| Meat pie | `meat-pie.webp` | Hajjare | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:A_Northern_Nigeria_snacks_called_meat_pie_21.jpg |
| Moi moi | `moi-moi.webp` | Casual Kitchen Express (made with Gemini) | CKE’s own | — |
| Ogbono | `ogbono.webp` | Bukky658 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Ogbono_soup_with_assorted_meats.jpg |
| Pounded yam (extra) | `pounded-yam.webp` | Ayoife Oni | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:POUNDED_YAM_%26_VEGETABLE_SOUP._A_native_delicacy_of_the_Yoruba_tribe_in_Nigeria,_West_Africa..jpg |
| Rice combo | `ricecombo.webp` | Tosinwrites | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:Fried_rice,_jollof_rice_and_beef.jpg |
| Soft drink | `soft-drink.webp` | pic_p_ter | Public domain | https://commons.wikimedia.org/wiki/File:Glass_cola.jpg |
| Spring rolls | `spring-rolls.webp` | Choo Yut Shing | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Fried_Spring_Rolls_(54538849838).jpg |
| Yoghurt drink | `yoghurt-drink.webp` | Casual Kitchen Express (made with Gemini) | CKE’s own | — |

## Staff photos

The ten starting staff photos (`apps/api/seed-media/staff/<staff ID>.webp`) were made by the owner with Google Gemini and are CKE’s own. Owner decision (12 November 2026): they carry no credit anywhere in the apps and are not marked as demo; they ship with the app’s starting data. Each is a 1:1 crop (about 276 px) saved as WebP under 80 KB.

## New photos

Photos uploaded in the Business app record their own credit (CKE’s own photo, or the author, licence, and link of an internet photo), and the customer app’s Photo credits page is built from the photos in use, so this list covers the starting photos only.
