import { Router, type Request, type Response } from "express";
import { logger } from "../lib/logger.js";
import { getSecret } from "../lib/secrets.js";
import rateLimit from "express-rate-limit";

// Lazy imports для избежания проблем с инициализацией
let supabaseAdmin: any;
let hasServiceRoleKey: boolean;
let repositories: any;

async function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    const { supabaseAdmin: admin, hasServiceRoleKey: hasKey } = await import("../lib/supabase.js");
    supabaseAdmin = admin;
    hasServiceRoleKey = hasKey;
  }
  return { supabaseAdmin, hasServiceRoleKey };
}

async function getRepositories() {
  if (!repositories) {
    repositories = (await import("../repositories/index.js")).repositories;
  }
  return repositories;
}

const router = Router();

// Rate limiter для OAuth endpoints
const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 requests per windowMs
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Инициирует OAuth поток с Yandex
 * GET /api/auth/yandex
 */
router.get("/yandex", oauthLimiter, (req: Request, res: Response) => {
  try {
    const yandexClientId = getSecret("YANDEX_CLIENT_ID");
    const frontendUrl = getSecret("FRONTEND_URL") || process.env.VITE_FRONTEND_URL || "http://localhost:5173";
    
    if (!yandexClientId) {
      logger.error("YANDEX_CLIENT_ID is not configured");
      return res.status(500).json({ error: "Yandex OAuth не настроен на сервере" });
    }

    // Генерируем state для защиты от CSRF
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Сохраняем state в сессии (можно использовать Redis в продакшене)
    // Для простоты используем cookie
    res.cookie("oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60 * 1000, // 10 минут
    });

    // Redirect URL для callback
    // В development используем localhost:3001 напрямую, в production - из конфига
    const isDev = process.env.NODE_ENV !== "production";
    const serverPort = process.env.PORT || "3001";
    const callbackUrl = isDev 
      ? `http://localhost:${serverPort}/api/auth/yandex/callback`
      : `${req.protocol}://${req.get("host")}/api/auth/yandex/callback`;
    
    logger.info("Yandex OAuth callback URL:", { callbackUrl });
    
    // Параметры для Yandex OAuth
    const params = new URLSearchParams({
      response_type: "code",
      client_id: yandexClientId,
      redirect_uri: callbackUrl,
      state: state,
    });

    const yandexAuthUrl = `https://oauth.yandex.com/authorize?${params.toString()}`;
    
    logger.info("Redirecting to Yandex OAuth", { callbackUrl });
    res.redirect(yandexAuthUrl);
  } catch (error) {
    logger.error("Error initiating Yandex OAuth", error);
    res.status(500).json({ error: "Ошибка при инициации авторизации" });
  }
});

/**
 * Обрабатывает callback от Yandex OAuth
 * GET /api/auth/yandex/callback
 */
router.get("/yandex/callback", oauthLimiter, async (req: Request, res: Response) => {
  try {
    logger.info("Yandex OAuth callback received", { query: req.query, cookies: req.cookies });
    
    // Lazy load dependencies
    const { supabaseAdmin: admin, hasServiceRoleKey: hasKey } = await getSupabaseAdmin();
    const repos = await getRepositories();
    
    const { code, state, error, error_description } = req.query;
    const frontendUrl = getSecret("FRONTEND_URL") || process.env.VITE_FRONTEND_URL || "http://localhost:5173";

    // Проверяем ошибки от Yandex
    if (error) {
      logger.error("Yandex OAuth returned error", { 
        error, 
        error_description,
        query: req.query 
      });
      const errorMsg = error_description || error || "unknown_error";
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(errorMsg as string)}`);
    }

    // Проверяем state для защиты от CSRF
    const storedState = req.cookies?.oauth_state;
    if (!storedState || storedState !== state) {
      logger.warn("Invalid OAuth state", { 
        storedState, 
        receivedState: state,
        cookies: req.cookies 
      });
      return res.redirect(`${frontendUrl}/login?error=invalid_state`);
    }

    // Очищаем state cookie
    res.clearCookie("oauth_state");

    if (!code) {
      logger.error("No authorization code received from Yandex", { query: req.query });
      return res.redirect(`${frontendUrl}/login?error=missing_code`);
    }
    
    logger.info("Processing Yandex OAuth code exchange", { code: code.substring(0, 10) + "..." });

    const yandexClientId = getSecret("YANDEX_CLIENT_ID");
    const yandexClientSecret = getSecret("YANDEX_CLIENT_SECRET");
    // В callback используем тот же URL, что был в инициации
    const callbackUrl = process.env.NODE_ENV === "development"
      ? "http://localhost:3001/api/auth/yandex/callback"
      : `${req.protocol}://${req.get("host")}/api/auth/yandex/callback`;

    if (!yandexClientId || !yandexClientSecret) {
      logger.error("Yandex OAuth credentials not configured");
      return res.redirect(`${frontendUrl}/login?error=server_config`);
    }
    
    logger.info("Yandex OAuth callback processing", { 
      callbackUrl,
      hasClientId: !!yandexClientId,
      hasClientSecret: !!yandexClientSecret
    });

    // Обмениваем код на токен
    logger.info("Exchanging code for token", { 
      clientId: yandexClientId?.substring(0, 10) + "...",
      callbackUrl 
    });
    
    const tokenResponse = await fetch("https://oauth.yandex.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code as string,
        client_id: yandexClientId,
        client_secret: yandexClientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logger.error("Failed to exchange code for token", { 
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorText,
        clientId: yandexClientId,
        callbackUrl
      });
      return res.redirect(`${frontendUrl}/login?error=token_exchange_failed`);
    }
    
    logger.info("Token exchange successful");

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    if (!accessToken) {
      logger.error("No access token in response", { tokenData });
      return res.redirect(`${frontendUrl}/login?error=no_access_token`);
    }

    logger.info("Got access token from Yandex");

    // Получаем информацию о пользователе
    logger.info("Fetching user info from Yandex");
    const userInfoResponse = await fetch("https://login.yandex.ru/info", {
      headers: {
        Authorization: `OAuth ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      logger.error("Failed to get user info from Yandex", { 
        status: userInfoResponse.status,
        statusText: userInfoResponse.statusText,
        error: errorText 
      });
      return res.redirect(`${frontendUrl}/login?error=user_info_failed`);
    }

    const yandexUser = await userInfoResponse.json();
    
    // Извлекаем email и имя
    const email = yandexUser.default_email || yandexUser.emails?.[0];
    const firstName = yandexUser.first_name || "";
    const lastName = yandexUser.last_name || "";
    const fullName = `${firstName} ${lastName}`.trim() || yandexUser.real_name || email?.split("@")[0] || "Пользователь";

    if (!email) {
      logger.error("No email found in Yandex user info", { yandexUser });
      return res.redirect(`${frontendUrl}/login?error=no_email`);
    }

    if (!hasKey) {
      logger.error("SUPABASE_SERVICE_ROLE_KEY is required for OAuth");
      return res.redirect(`${frontendUrl}/login?error=server_config`);
    }

    // Проверяем, существует ли пользователь
    logger.info("Checking if user exists", { email });
    const { data: listUsersData, error: listUsersError } = await admin.auth.admin.listUsers({ email });

    if (listUsersError) {
      logger.error("Error listing users by email", { error: listUsersError, email });
      return res.redirect(`${frontendUrl}/login?error=server_error`);
    }

    const existingUser = listUsersData?.users?.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );

    let userId: string;
    let companyId: string | null = null;

    if (existingUser) {
      // Пользователь существует - обновляем метаданные если нужно
      userId = existingUser.id;
      const existingMetadata = existingUser.user_metadata as { company_id?: string } | null;
      companyId = existingMetadata?.company_id ?? null;
      
      logger.info("Existing user logged in via Yandex", { userId, email });
    } else {
      // Новый пользователь - нужно создать компанию и пользователя
      // Для OAuth регистрации компания будет создана автоматически с дефолтным именем
      // Пользователь сможет изменить название компании позже в настройках
      
      const defaultCompanyName = `${fullName}'s Company`;
      logger.info("Creating new company for OAuth user", { companyName: defaultCompanyName });
      
      let company;
      try {
        company = await repos.company.create({ name: defaultCompanyName } as any);
        logger.info("Company created successfully", { companyId: company.id });
      } catch (companyError) {
        logger.error("Failed to create company", { error: companyError });
        return res.redirect(`${frontendUrl}/login?error=user_creation_failed`);
      }

      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          company_id: company.id,
          full_name: fullName,
          yandex_id: yandexUser.id,
          auth_provider: "yandex",
        },
      });

      if (createError || !newUser.user) {
        logger.error("Failed to create user", { error: createError });
        await repos.company.delete(company.id);
        return res.redirect(`${frontendUrl}/login?error=user_creation_failed`);
      }

      userId = newUser.user.id;
      companyId = company.id;
      
      logger.info("New user created via Yandex OAuth", { userId, email, companyId });
    }

    // Создаем сессию через Supabase Admin API
    // Используем recovery тип для генерации ссылки - он более надежен
    logger.info("Generating auth link for user", { userId, email });
    
    try {
      // Пробуем сначала recovery тип
      let linkData: any;
      let linkError: any;
      
      // Вариант 1: recovery (более надежный для OAuth пользователей)
      ({ data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: email,
        options: {
          redirectTo: `${frontendUrl.replace(/\/$/, "")}/login`,
        },
      }));

      // Если recovery не сработал, пробуем magiclink
      if (linkError || !linkData) {
        logger.warn("Recovery link failed, trying magiclink", { error: linkError });
        ({ data: linkData, error: linkError } = await admin.auth.admin.generateLink({
          type: "magiclink",
          email: email,
          options: {
            redirectTo: `${frontendUrl.replace(/\/$/, "")}/login`,
          },
        }));
      }

      logger.info("generateLink response", { 
        hasError: !!linkError,
        errorMessage: linkError?.message,
        hasData: !!linkData,
        linkDataType: typeof linkData,
        linkDataStructure: linkData ? Object.keys(linkData) : []
      });

      if (linkError) {
        logger.error("Failed to generate auth link", { 
          error: linkError,
          errorMessage: linkError.message,
          errorStatus: (linkError as any).status,
        });
        return res.redirect(`${frontendUrl}/login?error=session_failed`);
      }

      if (!linkData) {
        logger.error("No data in generateLink response");
        return res.redirect(`${frontendUrl}/login?error=session_failed`);
      }

      // Извлекаем action_link из разных возможных структур
      let actionLink: string | undefined;
      
      // Стандартная структура: { properties: { action_link: "..." } }
      if (linkData.properties?.action_link) {
        actionLink = linkData.properties.action_link;
      }
      // Альтернативная структура: { action_link: "..." }
      else if ((linkData as any).action_link) {
        actionLink = (linkData as any).action_link;
      }
      // Если это строка напрямую
      else if (typeof linkData === 'string') {
        actionLink = linkData;
      }
      // Попробуем найти любую строку, похожую на URL
      else {
        const linkDataStr = JSON.stringify(linkData);
        const urlMatch = linkDataStr.match(/https?:\/\/[^\s"']+/);
        if (urlMatch) {
          actionLink = urlMatch[0];
        }
      }

      logger.info("Extracted action link", { 
        hasActionLink: !!actionLink,
        actionLinkPreview: actionLink?.substring(0, 150)
      });
      
      if (!actionLink) {
        logger.error("No action_link found", { 
          linkData: JSON.stringify(linkData, null, 2)
        });
        return res.redirect(`${frontendUrl}/login?error=session_failed`);
      }

      // Проходим Supabase verification link, чтобы получить финальный redirect с токенами
      try {
        const verificationResponse = await fetch(actionLink, {
          redirect: "manual",
        });

        const locationHeader =
          verificationResponse.headers.get("location") ||
          verificationResponse.headers.get("Location");

        if (!locationHeader) {
          logger.error("Supabase verification response missing location header", {
            status: verificationResponse.status,
            actionLink,
          });
          return res.redirect(`${frontendUrl}/login?error=session_failed`);
        }

        let redirectUrl: URL;
        try {
          redirectUrl = new URL(locationHeader);
        } catch (parseError: any) {
          logger.error("Failed to parse redirect location", {
            locationHeader,
            error: parseError?.message,
          });
          return res.redirect(`${frontendUrl}/login?error=session_failed`);
        }

        if (!redirectUrl.hash || redirectUrl.hash.length < 10) {
          logger.error("Invalid or empty hash in Supabase redirect URL", {
            redirectUrl: redirectUrl.toString(),
            hashPreview: redirectUrl.hash?.substring(0, 50),
          });
          return res.redirect(`${frontendUrl}/login?error=session_failed`);
        }

        const frontendOrigin = new URL(frontendUrl).origin;
        if (redirectUrl.origin !== frontendOrigin) {
          logger.warn("Supabase redirect origin does not match frontend origin", {
            redirectOrigin: redirectUrl.origin,
            frontendOrigin,
          });
        }

        const finalRedirect = `${frontendOrigin}${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;

        logger.info("Redirecting to frontend with auth hash", {
          hashLength: redirectUrl.hash.length,
          finalRedirectPreview: finalRedirect.substring(0, 150),
        });

        // Редиректим на фронтенд с токеном в hash
        return res.redirect(finalRedirect);
      } catch (urlError: any) {
        logger.error("Failed to parse URL", { 
          error: urlError?.message,
          actionLink 
        });
        return res.redirect(`${frontendUrl}/login?error=session_failed`);
      }
    } catch (generateLinkError: any) {
      logger.error("Exception in generateLink", {
        error: generateLinkError?.message || generateLinkError,
        stack: generateLinkError?.stack?.substring(0, 500),
        name: generateLinkError?.name,
      });
      return res.redirect(`${frontendUrl}/login?error=session_failed`);
    }
    
  } catch (error: any) {
    // Улучшенное логирование ошибок
    logger.error("Error in Yandex OAuth callback", {
      error: error?.message || error,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      details: error
    });
    
    const frontendUrl = getSecret("FRONTEND_URL") || process.env.VITE_FRONTEND_URL || "http://localhost:5173";
    
    // Определяем конкретную ошибку для более точного сообщения
    let errorCode = "server_error";
    if (error?.message?.includes("Supabase") || error?.message?.includes("auth")) {
      errorCode = "session_failed";
    } else if (error?.message?.includes("company") || error?.message?.includes("database")) {
      errorCode = "user_creation_failed";
    }
    
    return res.redirect(`${frontendUrl}/login?error=${errorCode}`);
  }
});

export default router;
