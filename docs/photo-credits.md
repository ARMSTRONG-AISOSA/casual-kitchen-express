# CKE Photo Credits

**Last updated:** 12 November 2026

The menu photos used in the apps (and later the website), with where each came from, as the brand document asks (`Casual-Kitchen-Express.md`, Food Imagery). The customer app shows the same list under More, Photo credits. The files are in `apps/api/seed-media/menu/`, and `credits.json` there holds the same details for the seed script.

**How they were chosen (12 November 2026):** searched Wikimedia Commons and Openverse (which includes Flickr) for each dish, kept only licences that allow commercial use and changes, rejected photos that didn’t match the dish or showed brand logos, and checked each one by eye. Each photo was cropped to 4:3, resized to at most 1200 px on the longest edge, and saved as WebP at quality 78 (all under 250 KB, most under 130 KB), with location and camera data removed (`architecture.md` 8.1). CC BY-SA photos stay under CC BY-SA after these changes.

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
| Home Plate | `home-plate.webp` | Justdifference | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Pounded_Yam_and_Egusi_Soup.jpg |
| Jollof rice | `jollof.webp` | Halima Waziri | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Nigerian_jollof_rice.jpg |
| Meat pie | `meat-pie.webp` | Hajjare | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:A_Northern_Nigeria_snacks_called_meat_pie_21.jpg |
| Moi moi | `moi-moi.webp` | Hajjare | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:A_Northern_Nigeria_food_called_moi_moi_2.jpg |
| Ogbono | `ogbono.webp` | Bukky658 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Ogbono_soup_with_assorted_meats.jpg |
| Pounded yam (extra) | `pounded-yam.webp` | Ayoife Oni | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:POUNDED_YAM_%26_VEGETABLE_SOUP._A_native_delicacy_of_the_Yoruba_tribe_in_Nigeria,_West_Africa..jpg |
| Rice combo | `ricecombo.webp` | Tosinwrites | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:Fried_rice,_jollof_rice_and_beef.jpg |
| Soft drink | `soft-drink.webp` | pic_p_ter | Public domain | https://commons.wikimedia.org/wiki/File:Glass_cola.jpg |
| Spring rolls | `spring-rolls.webp` | Choo Yut Shing | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Fried_Spring_Rolls_(54538849838).jpg |
| Yoghurt drink | `yoghurt-drink.webp` | idovermani | CC BY 2.0 | https://www.flickr.com/photos/11155746@N00/3332421316 |

## Still to do

| Dish | Status |
|---|---|
| Office Lunch Combo | No free photo found (fried rice, beef, coleslaw, and water together). Placeholder for now. Options: an AI image based on real reference photos (the brand document’s fallback), or a photo of the real dish. |
| Yoghurt drink, Moi moi, Home Plate | Usable but weak (a plain glass, a tight close-up, a busy table). Worth replacing when better photos turn up. |
| New soups added in the app | Photo upload is built (12 November 2026): the photo dialog opens when a soup is added, and any soup’s photo can be added or changed later on Menu. |
| Staff photos (demo staff) | Owner decision (12 November 2026): freely licensed photos of Nigerians, matched to each person’s gender, credited, and marked as demo so real staff photos can replace them. Wikimedia Commons had too few (and mostly named public figures, which are excluded) and Openverse was down, so they come from Pexels once the owner has an API key. |
| Better food photos | The owner chose a larger library search over AI images (12 November 2026). Waiting for a Pexels API key (and optionally Unsplash). |

Photos uploaded in the Business app record their own credit (CKE’s own photo, or the author, licence, and link of an internet photo), and the customer app’s Photo credits page is built from the photos in use, so this list covers the starting photos only.
