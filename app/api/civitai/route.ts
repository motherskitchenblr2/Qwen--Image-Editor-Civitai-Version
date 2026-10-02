import { NextRequest, NextResponse } from "next/server";

const CIVITAI_API_KEY = process.env.CIVITAI_API_KEY || "";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "";
  const sort = searchParams.get("sort") || "Most Downloaded";
  const period = searchParams.get("period") || "AllTime";
  const limit = searchParams.get("limit") || "16";
  const page = searchParams.get("page") || "1";
  const baseModel = searchParams.get("baseModel") || "";

  // Map user-friendly sort to Civitai API sort parameters
  let civitaiSort = "Most Downloaded";
  if (sort === "Highest Rated") civitaiSort = "Highest Rated";
  if (sort === "Newest") civitaiSort = "Newest";

  // Build target Civitai URL
  const params = new URLSearchParams();
  params.append("types", "LORA");
  params.append("sort", civitaiSort);
  if (civitaiSort !== "Newest") {
    params.append("period", period);
  }
  params.append("limit", limit);
  params.append("nsfw", "false"); // Default to SFW models

  if (query.trim()) {
    params.append("query", query.trim());
    // Civitai API rule: 'page' cannot be used with query search (only cursor or none)
  } else if (page) {
    params.append("page", page);
  }

  if (baseModel && baseModel !== "All") {
    params.append("baseModels", baseModel);
  }

  // Try civitai.red first, then fall back to civitai.com
  const endpoints = [
    `https://civitai.red/api/v1/models?${params.toString()}`,
    `https://civitai.com/api/v1/models?${params.toString()}`,
  ];

  let rawData: any = null;
  let errorMsg = "";

  for (const endpoint of endpoints) {
    try {
      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      };
      if (CIVITAI_API_KEY) {
        headers["Authorization"] = `Bearer ${CIVITAI_API_KEY}`;
      }

      const res = await fetch(endpoint, {
        headers,
        next: { revalidate: 60 }, // Cache 60s
      });

      if (res.ok) {
        rawData = await res.json();
        if (rawData && rawData.items) {
          break;
        }
      } else {
        errorMsg = `Endpoint ${endpoint} returned status ${res.status}`;
      }
    } catch (e: any) {
      errorMsg = e.message || "Network error fetching Civitai models";
    }
  }

  if (!rawData || !rawData.items) {
    return NextResponse.json(
      {
        items: [],
        metadata: { totalItems: 0, currentPage: Number(page), pageSize: Number(limit) },
        error: errorMsg || "Could not retrieve models from Civitai.",
      },
      { status: 200 }
    );
  }

  // Normalize items for high-fidelity UI rendering
  const items = (rawData.items || []).map((item: any) => {
    const versions = item.modelVersions || [];
    const primaryVersion = versions[0] || {};
    const primaryFile = (primaryVersion.files || []).find((f: any) => f.primary) || (primaryVersion.files || [])[0] || {};
    
    // Extract thumbnail images
    const images = (primaryVersion.images || []).map((img: any) => ({
      id: img.id,
      url: img.url,
      width: img.width || 512,
      height: img.height || 768,
      nsfwLevel: img.nsfwLevel || 1,
    }));

    // Calculate file size in MB
    const sizeKB = primaryFile.sizeKB || 0;
    const sizeMB = sizeKB > 0 ? (sizeKB / 1024).toFixed(1) : "N/A";

    return {
      id: item.id,
      name: item.name,
      description: item.description ? item.description.replace(/<[^>]*>?/gm, "").slice(0, 160) : "",
      creator: {
        username: item.creator?.username || "Community Creator",
        image: item.creator?.image || null,
      },
      tags: item.tags || [],
      stats: {
        downloadCount: item.stats?.downloadCount || 0,
        thumbsUpCount: item.stats?.thumbsUpCount || 0,
        commentCount: item.stats?.commentCount || 0,
      },
      version: {
        id: primaryVersion.id,
        name: primaryVersion.name || "Default",
        baseModel: primaryVersion.baseModel || "SDXL 1.0",
        downloadUrl: primaryVersion.downloadUrl || `https://civitai.red/api/download/models/${primaryVersion.id}`,
        trainedWords: primaryVersion.trainedWords || [],
        fileName: primaryFile.name || `${item.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.safetensors`,
        sizeMB: sizeMB,
      },
      allVersions: versions.map((v: any) => ({
        id: v.id,
        name: v.name,
        baseModel: v.baseModel,
        downloadUrl: v.downloadUrl || `https://civitai.red/api/download/models/${v.id}`,
        trainedWords: v.trainedWords || [],
        fileName: (v.files && v.files[0]?.name) || `model_${v.id}.safetensors`,
        sizeMB: v.files && v.files[0]?.sizeKB ? (v.files[0].sizeKB / 1024).toFixed(1) : "N/A",
      })),
      images: images,
    };
  });

  return NextResponse.json({
    items,
    metadata: rawData.metadata || { totalItems: items.length, currentPage: Number(page), pageSize: Number(limit) },
  });
}
