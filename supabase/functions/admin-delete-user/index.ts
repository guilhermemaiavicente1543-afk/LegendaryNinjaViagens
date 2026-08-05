import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function isMissingBucketError(error: { message?: string } | null) {
  return /bucket.*not found|not found.*bucket/i.test(error?.message || "");
}

async function removeFilesForPrefix(
  serviceClient: ReturnType<typeof createClient>,
  prefix: string,
) {
  const bucket = serviceClient.storage.from("character-proofs");
  const folders = ["profile-photos", "proofs", "hidden-actions"];

  for (const folder of folders) {
    const folderPath = `${prefix}/${folder}`;

    while (true) {
      const { data, error } = await bucket.list(folderPath, {
        limit: 1000,
        offset: 0,
        sortBy: { column: "name", order: "asc" },
      });

      if (error) {
        if (isMissingBucketError(error)) return;
        throw new Error(`Falha ao listar arquivos de ${folderPath}: ${error.message}`);
      }

      const filePaths = (data || [])
        .filter((item) => Boolean(item.id))
        .map((item) => `${folderPath}/${item.name}`);

      if (filePaths.length === 0) break;

      const { error: removeError } = await bucket.remove(filePaths);

      if (removeError) {
        throw new Error(`Falha ao remover arquivos de ${folderPath}: ${removeError.message}`);
      }

      if (filePaths.length < 1000) break;
    }
  }
}

async function cleanupResidualRows(
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
  characterIds: string[],
) {
  const operations: Array<PromiseLike<{ error: { message?: string } | null }>> = [];

  if (characterIds.length > 0) {
    operations.push(
      serviceClient
        .from("character_inventory_items")
        .delete()
        .in("character_id", characterIds),
      serviceClient
        .from("character_skills")
        .delete()
        .in("character_id", characterIds),
      serviceClient
        .from("travels")
        .delete()
        .in("character_id", characterIds),
    );
  }

  operations.push(
    serviceClient
      .from("character_inventory_items")
      .delete()
      .eq("user_id", userId),
    serviceClient.from("travels").delete().eq("user_id", userId),
    serviceClient.from("characters").delete().eq("user_id", userId),
    serviceClient.from("profiles").delete().eq("id", userId),
  );

  const results = await Promise.allSettled(operations);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Falha ao limpar dado residual:", result.reason);
      continue;
    }

    if (result.value.error) {
      console.error("Falha ao limpar dado residual:", result.value.error.message);
    }
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Método não permitido." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Função administrativa não configurada." }, 500);
    }

    const authorization = request.headers.get("Authorization") || "";
    const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();

    if (!accessToken) {
      return jsonResponse({ error: "Sessão administrativa ausente." }, 401);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user: caller },
      error: callerError,
    } = await serviceClient.auth.getUser(accessToken);

    if (callerError || !caller) {
      return jsonResponse({ error: "Sessão inválida ou expirada." }, 401);
    }

    const { data: callerProfile, error: callerProfileError } = await serviceClient
      .from("profiles")
      .select("id, role")
      .eq("id", caller.id)
      .maybeSingle();

    if (callerProfileError || callerProfile?.role !== "admin") {
      return jsonResponse({ error: "Apenas administradores podem excluir contas." }, 403);
    }

    const body = await request.json().catch(() => ({}));
    const targetUserId = body?.userId;

    if (!isUuid(targetUserId)) {
      return jsonResponse({ error: "Identificador de conta inválido." }, 400);
    }

    if (targetUserId === caller.id) {
      return jsonResponse({ error: "Você não pode excluir a conta usada nesta sessão." }, 409);
    }

    const { data: targetAuthResult, error: targetAuthError } =
      await serviceClient.auth.admin.getUserById(targetUserId);

    if (targetAuthError || !targetAuthResult?.user) {
      return jsonResponse({ error: "Conta não encontrada na autenticação." }, 404);
    }

    const { data: targetProfile, error: targetProfileError } = await serviceClient
      .from("profiles")
      .select("id, role")
      .eq("id", targetUserId)
      .maybeSingle();

    if (targetProfileError) {
      return jsonResponse({ error: `Falha ao verificar a conta: ${targetProfileError.message}` }, 500);
    }

    const targetMetadataRole =
      targetAuthResult.user.app_metadata?.role ||
      targetAuthResult.user.user_metadata?.role ||
      "";

    if (targetProfile?.role === "admin" || targetMetadataRole === "admin") {
      return jsonResponse({ error: "Contas administrativas são protegidas contra exclusão." }, 409);
    }

    const { data: targetCharacters, error: targetCharactersError } = await serviceClient
      .from("characters")
      .select("id")
      .eq("user_id", targetUserId);

    if (targetCharactersError) {
      return jsonResponse({ error: `Falha ao localizar personagens: ${targetCharactersError.message}` }, 500);
    }

    const characterIds = (targetCharacters || [])
      .map((character) => String(character.id || ""))
      .filter(Boolean);

    const storagePrefixes = Array.from(new Set([targetUserId, ...characterIds]));

    for (const prefix of storagePrefixes) {
      await removeFilesForPrefix(serviceClient, prefix);
    }

    const { error: deleteUserError } = await serviceClient.auth.admin.deleteUser(
      targetUserId,
      false,
    );

    if (deleteUserError) {
      return jsonResponse({ error: `A autenticação recusou a exclusão: ${deleteUserError.message}` }, 500);
    }

    await cleanupResidualRows(serviceClient, targetUserId, characterIds);

    console.info("Conta excluída pelo Painel ADM", {
      administratorId: caller.id,
      deletedUserId: targetUserId,
      deletedCharacterIds: characterIds,
    });

    return jsonResponse({
      ok: true,
      deletedUserId: targetUserId,
      deletedCharacters: characterIds.length,
    });
  } catch (error) {
    console.error("Erro inesperado em admin-delete-user:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Erro inesperado." },
      500,
    );
  }
});
