import { useRef, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

export default function CharacterPortraitUploader({
  user,
  character,
  value,
  onUploaded
}) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(value || "");
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setMessage("");

    if (!user?.id || !character?.id) {
      setMessage("Crie seu ninja antes de enviar uma imagem.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setMessage("Supabase não está configurado.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Envie apenas arquivos de imagem.");
      return;
    }

    const extension = file.name.split(".").pop() || "png";
    const safeExtension = extension.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const filePath = `${user.id}/${character.id}/portrait-${Date.now()}.${safeExtension}`;

    setIsUploading(true);

    const { error: uploadError } = await supabase.storage
      .from("character-portraits")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type
      });

    if (uploadError) {
      setIsUploading(false);
      setMessage(`Erro ao enviar imagem: ${uploadError.message}`);
      return;
    }

    const { data: publicData } = supabase.storage
      .from("character-portraits")
      .getPublicUrl(filePath);

    const publicUrl = publicData?.publicUrl;

    if (!publicUrl) {
      setIsUploading(false);
      setMessage("Não foi possível gerar URL pública da imagem.");
      return;
    }

    const { data: updatedCharacter, error: updateError } = await supabase
      .from("characters")
      .update({
        portrait_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq("id", character.id)
      .select("*")
      .single();

    setIsUploading(false);

    if (updateError) {
      setMessage(`Imagem enviada, mas erro ao salvar no ninja: ${updateError.message}`);
      return;
    }

    setPreviewUrl(publicUrl);
    onUploaded?.(publicUrl, updatedCharacter);
    setMessage("Foto do personagem atualizada.");
  }

  const imageUrl = previewUrl || value || character?.portrait_url || "";

  return (
    <div className="character-portrait-uploader">
      <div className="character-portrait-frame">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={character?.character_name || "Personagem"}
            onError={() => {
              setPreviewUrl("");
              setMessage("A imagem foi salva, mas não carregou. Verifique se o bucket está público.");
            }}
          />
        ) : (
          <div className="character-portrait-empty">
            <span>忍</span>
            <small>Sem foto</small>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        hidden
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? "Enviando..." : "Alterar foto"}
      </button>

      {message && <small className="character-portrait-message">{message}</small>}
    </div>
  );
}
