import type { PhotoCredit, PhotoKind } from "@cke/api-client";
import { Image } from "expo-image";
import { useState } from "react";
import { View } from "react-native";
import { api } from "../api";
import { pickPhoto, sizeNote, type Compressed, type Purpose } from "../media/compress";
import { useStore } from "../state/store";
import { useTheme } from "../state/theme";
import { Button, Chip, Chips, Field, Segmented, Sheet, T } from "./kit";
import { useToast } from "./toast";

const LICENCES = ["CC0", "CC BY 4.0", "CC BY-SA 4.0", "Public domain", "Other"];

/**
 * Add, change, or remove a photo (menu items, soups, staff). Every photo goes through the same
 * crop and compression first (src/media/compress.ts), then uploads with its credit in one call.
 * The API deletes the old photo, so the new one shows everywhere and the credits follow.
 */
export function PhotoEditor({
  visible,
  onClose,
  kind,
  targetId,
  title,
  currentUri,
  photoKey,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  kind: PhotoKind;
  /** The menu item or soup ID, or the staff code. */
  targetId?: string;
  title: string;
  currentUri?: string;
  /** Where the app keeps this photo: the dish or soup name, or the staff code. */
  photoKey?: string;
  /** Refreshes from the API afterwards (the screen already shows the change). */
  onSaved: () => void | Promise<void>;
}) {
  const t = useTheme();
  const toast = useToast();
  const { set } = useStore();
  // Shows the change straight away, everywhere this photo appears in the app.
  const show = (photoId: string | null, credit?: PhotoCredit) => {
    if (!api || !photoKey) return;
    const uri = photoId ? api.mediaUrl(photoId) : null;
    if (kind === "staff")
      set((st) => {
        const next = { ...st.staffPhotos };
        if (uri && credit)
          next[photoKey] = {
            uri,
            sourceKind: credit.sourceKind,
            author: credit.author || null,
            licence: credit.sourceKind === "internet" ? credit.licence : null,
            sourceUrl: credit.sourceUrl || null,
          };
        else delete next[photoKey];
        return { staffPhotos: next };
      });
    else
      set((st) => {
        const next = { ...st.photos };
        if (uri) next[photoKey] = uri;
        else delete next[photoKey];
        return { photos: next };
      });
  };
  const purpose: Purpose = kind === "staff" ? "profile" : "menu";
  const [picked, setPicked] = useState<Compressed | null>(null);
  const [source, setSource] = useState<"business" | "internet">("business");
  const [author, setAuthor] = useState("");
  const [link, setLink] = useState("");
  const [licence, setLicence] = useState("");
  const [otherLicence, setOtherLicence] = useState("");
  const [licenceLink, setLicenceLink] = useState("");
  const [busy, setBusy] = useState(false);
  // Shown inside the dialog: messages from the toast would sit behind it.
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setPicked(null);
    setAuthor("");
    setLink("");
    setLicence("");
    setOtherLicence("");
    setLicenceLink("");
    setSource("business");
    setError(null);
    onClose();
  };

  const run = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (e) {
      console.warn("Photo editor", e);
      setError(e instanceof Error ? e.message : "Couldn’t save the photo. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const choose = (from: "camera" | "library") =>
    run(async () => {
      const c = await pickPhoto(from, purpose);
      if (c) setPicked(c);
    });

  const finalLicence = licence === "Other" ? otherLicence.trim() : licence;
  const needs =
    source === "internet"
      ? !author.trim()
        ? "Enter who took the photo"
        : !finalLicence
          ? "Choose the licence"
          : !/^https?:\/\//.test(link.trim())
            ? "Enter the link to where the photo came from"
            : null
      : link.trim() && !/^https?:\/\//.test(link.trim())
        ? "Links start with https://"
        : null;

  const save = () =>
    run(async () => {
      if (!api || !targetId || !picked) throw new Error("Connect to the API to save photos.");
      const credit: PhotoCredit =
        source === "business"
          ? { sourceKind: "business", author: author.trim(), sourceUrl: link.trim() }
          : {
              sourceKind: "internet",
              author: author.trim(),
              licence: finalLicence,
              licenceUrl: licenceLink.trim(),
              sourceUrl: link.trim(),
            };
      // Expo's fetch sends files as Blobs, so read the compressed file into one first.
      const blob = await (await fetch(picked.uri)).blob();
      const { photoId } = await api.uploadPhoto(kind, targetId, blob, credit);
      show(photoId, credit);
      void onSaved();
      toast(`Photo saved for ${title}`);
      close();
    });

  const remove = () =>
    run(async () => {
      if (!api || !targetId) throw new Error("Connect to the API to change photos.");
      await api.removePhoto(kind, targetId);
      show(null);
      void onSaved();
      toast(`Photo removed from ${title}`);
      close();
    });

  const previewUri = picked?.uri ?? currentUri;
  const shape = purpose === "profile" ? { width: 160, height: 160 } : { width: 280, height: 210 };

  return (
    <Sheet visible={visible} onClose={close} title={`Photo: ${title}`}>
      <View style={{ alignItems: "center" }}>
        {previewUri ? (
          <Image
            source={{ uri: previewUri }}
            contentFit="cover"
            style={[shape, { borderRadius: purpose === "profile" ? 80 : 14 }]}
          />
        ) : (
          <View
            style={[
              shape,
              {
                borderRadius: purpose === "profile" ? 80 : 14,
                backgroundColor: t.chip,
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            <T muted>No photo yet</T>
          </View>
        )}
        {picked ? (
          <T v="small" muted style={{ marginTop: 6 }}>
            Compressed: {sizeNote(picked)}
          </T>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <Button label="Take photo" small disabled={busy} onPress={() => choose("camera")} />
        <Button
          label="Choose from gallery"
          variant="ghost"
          small
          disabled={busy}
          onPress={() => choose("library")}
        />
        {currentUri && !picked ? (
          <Button label="Remove photo" variant="ghost" small disabled={busy} onPress={remove} />
        ) : null}
      </View>

      {picked ? (
        <>
          <T v="label" style={{ marginTop: 16 }}>
            Where’s the photo from?
          </T>
          <View style={{ marginTop: 8 }}>
            <Segmented
              options={[
                ["business", "Our own photo"],
                ["internet", "From the internet"],
              ]}
              value={source}
              onChange={setSource}
            />
          </View>
          {source === "business" ? (
            <>
              <Field
                label="Taken by (optional)"
                value={author}
                onChangeText={setAuthor}
                placeholder="For example Ada"
                hint="Credited as Casual Kitchen Express, with this name if given."
              />
              <Field
                label="Link (optional)"
                value={link}
                onChangeText={setLink}
                autoCapitalize="none"
                keyboardType="url"
                placeholder="https://"
              />
            </>
          ) : (
            <>
              <Field label="Who took it" value={author} onChangeText={setAuthor} />
              <T v="label" style={{ marginTop: 14 }}>
                Licence
              </T>
              <Chips style={{ marginTop: 8 }}>
                {LICENCES.map((l) => (
                  <Chip key={l} label={l} selected={licence === l} onPress={() => setLicence(l)} />
                ))}
              </Chips>
              {licence === "Other" ? (
                <Field label="Licence name" value={otherLicence} onChangeText={setOtherLicence} />
              ) : null}
              <Field
                label="Link to the photo"
                value={link}
                onChangeText={setLink}
                autoCapitalize="none"
                keyboardType="url"
                placeholder="https://"
              />
              <Field
                label="Licence link (optional)"
                value={licenceLink}
                onChangeText={setLicenceLink}
                autoCapitalize="none"
                keyboardType="url"
                placeholder="https://"
              />
            </>
          )}
          {needs ? (
            <T v="small" muted style={{ marginTop: 8 }}>
              {needs}
            </T>
          ) : null}
          <Button
            label={currentUri ? "Replace the photo" : "Save the photo"}
            style={{ marginTop: 14 }}
            disabled={busy || !!needs}
            onPress={save}
          />
          {currentUri ? (
            <T v="small" muted style={{ marginTop: 6 }}>
              The old photo is deleted and the new one shows everywhere.
            </T>
          ) : null}
        </>
      ) : null}
      {busy ? (
        <T v="small" muted style={{ marginTop: 10 }}>
          Working…
        </T>
      ) : null}
      {error ? (
        <T v="small" color={t.danger} style={{ marginTop: 10 }}>
          {error}
        </T>
      ) : null}
      {!api ? (
        <T v="small" muted style={{ marginTop: 10 }}>
          Not connected to the API, so photos can’t be saved.
        </T>
      ) : null}
    </Sheet>
  );
}
