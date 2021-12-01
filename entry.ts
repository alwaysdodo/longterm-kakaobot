// TODO: KAKAO_TITLE, NOTION_DATABASE, WEEKS 수정 필요

import { NotiflowBody } from "./notiflow.ts";
import { createKakaoBalloonSvg } from "./svg.ts";
const KAKAO_TITLE = "롱텀두두 5회차🍂🍁";

// 4회 Production: https://www.notion.so/alwaysdodo/72c32fb2699b4075bf907585f3fb59ed?v=29802380246f432b9f3488890c89caa9
// 5회 Production: https://www.notion.so/alwaysdodo/d88a749ca4884655b66998f5a532f8ee?v=66e6f0de6f10468c9b9b7f11a2dcfb98
const NOTION_DATABASE = "d88a749ca4884655b66998f5a532f8ee";

// Development: https://www.notion.so/wan2land/2c5e7017d0604fcf9deeb9bd1ab5db6e?v=35912fbf6be8492b906f9cfba60ea351
// const NOTION_DATABASE = "2c5e7017d0604fcf9deeb9bd1ab5db6e";

const WEEKS: [from: string, to: string][] = [
  ["2021-11-13", "2021-11-21"],
  ["2021-11-22", "2021-11-28"],
  ["2021-11-29", "2021-12-05"],
];

const NOTION_SECRET = Deno.env.get("NOTION_SECRET");

async function writeDodoLog(
  name: string,
  content: string,
): Promise<string | undefined> {
  const now = new Date();
  const [yyyy, M, d] = now
    .toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })
    .replace(/\.\s*/g, "-")
    .replace(/-+$/, "")
    .split('-');

  const today = `${yyyy}-${M.padStart(2, '0')}-${d.padStart(2, '0')}`
  
  const weekIndex = WEEKS.findIndex(
    ([from, to]) => from <= today && today <= to,
  );
  if (weekIndex < 0) {
    return "인증기간이 끝났어요. 다음번 두두에 만나요! 뿅 🐹";
  }

  // // 내 정보 가져오기, 디버깅용
  // const me = await fetch(
  //   `https://api.notion.com/v1/users/me`,
  //   {
  //     headers: {
  //       "Authorization": `Bearer ${NOTION_SECRET}`,
  //       "Notion-Version": "2021-08-16",
  //     },
  //   },
  // ).then((response) => response.json());
  // console.log("me", me);

  const db = await fetch(
    `https://api.notion.com/v1/databases/${NOTION_DATABASE}/query`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NOTION_SECRET}`,
        "Notion-Version": "2021-08-16",
      },
    },
  ).then((response) => response.json());

  if (db.message) {
    throw new Error(db.message);
  }

  const result = db.results.find((result: any) => {
    try {
      return result.properties.Name.title[0].plain_text === name;
    } catch {
      return false;
    }
  });

  if (!result) {
    return "목표달성표에서 찾지 못했어요. 닉네임 확인 부탁드려요. 🥲";
  }

  const weekName = `${weekIndex + 1}주차`;

  {
    // weekText like '0/5'
    const weekText: string =
      (result.properties[weekName]?.rich_text[0]?.plain_text ?? "0/?");
    const nextWeekText = weekText.replace(
      /([^\d]|^)(\d+)\/(\d*)[ ]*/,
      (_, prefix, count, total) => {
        const countInt = parseInt(count) + 1;
        const totalInt = parseInt(total);
        const complete = !isNaN(totalInt) && countInt >= totalInt ? " 🎉" : "";
        return `${prefix}${countInt}/${total}${complete}`;
      },
    );

    await fetch(`https://api.notion.com/v1/pages/${result.id}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${NOTION_SECRET}`,
        "Notion-Version": "2021-08-16",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          [weekName]: {
            "rich_text": [
              {
                "type": "text",
                "text": {
                  "content": nextWeekText,
                },
              },
            ],
          },
        },
      }),
    }).then((response) => response.json());
  }
  {
    const imageUrl = new URL("https://longterm-kakaobot.deno.dev/message.svg");
    imageUrl.searchParams.set("name", name);
    imageUrl.searchParams.set("message", content);
    imageUrl.searchParams.set("ts", `${now.getTime()}`);
    await fetch(
      `https://api.notion.com/v1/blocks/${result.id}/children`,
      {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${NOTION_SECRET}`,
          "Notion-Version": "2021-08-16",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          children: [
            {
              "object": "block",
              "type": "paragraph",
              "paragraph": {
                "text": [{
                  "type": "text",
                  "text": { "content": `${today} 인증 추가` },
                }],
              },
            },
            {
              type: "image",
              image: {
                external: {
                  url: imageUrl.toString(),
                },
              },
            },
          ],
        }),
      },
    ).then((response) => response.json());
  }

  return `${name}님! ${weekName} 목표달성표에 등록되었어요! 😎`;
}

function createJsonResponse(json: any) {
  return new Response(JSON.stringify(json), {
    status: 200,
    headers: {
      server: "deploy",
      "content-type": "application/json; charset=UTF-8",
    },
  });
}

addEventListener("fetch", async (event) => {
  const url = new URL(event.request.url);

  if (url.pathname === "/message.svg") {
    const params = url.searchParams;
    const name = params.get("name") ?? "(이름없음)";
    const message = params.get("message") ?? "";
    const ts = +(params.get("ts") ?? Date.now());
    const svg = await createKakaoBalloonSvg(name, message, ts);

    event.respondWith(
      new Response(svg, {
        status: 200,
        headers: {
          "content-type": "image/svg+xml",
        },
      }),
    );
    return;
  }

  let body = null as NotiflowBody | null;
  try {
    body = await event.request.json();
  } catch {}

  if (body?.title !== KAKAO_TITLE) {
    event.respondWith(createJsonResponse({}));
    return;
  }

  console.log(`[BODY] ${JSON.stringify(body)}`);

  if (!body.message.includes("#인증")) {
    event.respondWith(createJsonResponse({}));
    return;
  }

  // 여기서 뭔가 작업합니다.
  try {
    const reply = await writeDodoLog(body.name, body.message);
    event.respondWith(createJsonResponse({
      reply,
    }));
  } catch (e) {
    console.log("[ERROR]", e);
    event.respondWith(createJsonResponse({}));
  }
});

// for debugging
// console.log(await writeDodoLog("완두", "오오왕"));
