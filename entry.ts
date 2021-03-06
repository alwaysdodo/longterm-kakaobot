// TODO: KAKAO_TITLE, NOTION_DATABASE, WEEKS μμ  νμ

import { NotiflowBody } from "./notiflow.ts";
import { createKakaoBalloonSvg } from "./svg.ts";
const KAKAO_TITLE = "πλ‘±νλλ 6ν";

// 4ν Production: https://www.notion.so/alwaysdodo/72c32fb2699b4075bf907585f3fb59ed?v=29802380246f432b9f3488890c89caa9
// 5ν Production: https://www.notion.so/alwaysdodo/65bd0f7894d44d49a878ec2d7a739111?v=a4e41f0048b2406bb36df0a9ed4e871b
// 6ν Production: https://www.notion.so/alwaysdodo/8d8665b125b84850988bf6c8027854a3?v=aa0d0e049ce04139bdcbdc80df5a135c
const NOTION_DATABASE = "8d8665b125b84850988bf6c8027854a3";

// Development: https://www.notion.so/wan2land/2c5e7017d0604fcf9deeb9bd1ab5db6e?v=35912fbf6be8492b906f9cfba60ea351
// const NOTION_DATABASE = "2c5e7017d0604fcf9deeb9bd1ab5db6e";

const WEEKS: [from: string, to: string][] = [
  ["2022-02-19", "2022-02-27"],
  ["2022-02-28", "2022-03-06"],
  ["2022-03-07", "2022-03-13"],
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
    return "μΈμ¦κΈ°κ°μ΄ λλ¬μ΄μ. λ€μλ² λλμ λ§λμ! λΏ πΉ";
  }

  // // λ΄ μ λ³΄ κ°μ Έμ€κΈ°, λλ²κΉμ©
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
    return "λͺ©νλ¬μ±νμμ μ°Ύμ§ λͺ»νμ΄μ. λλ€μ νμΈ λΆνλλ €μ. π₯²";
  }

  const weekName = `${weekIndex + 1}μ£Όμ°¨`;

  {
    // weekText like '0/5'
    const weekText: string =
      (result.properties[weekName]?.rich_text[0]?.plain_text ?? "0/?");
    const nextWeekText = weekText.replace(
      /([^\d]|^)(\d+)\/(\d*)[ ]*/,
      (_, prefix, count, total) => {
        const countInt = parseInt(count) + 1;
        const totalInt = parseInt(total);
        const complete = !isNaN(totalInt) && countInt >= totalInt ? " π" : "";
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
                  "text": { "content": `${today} μΈμ¦ μΆκ°` },
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

  return `${name}λ! ${weekName} λͺ©νλ¬μ±νμ λ±λ‘λμμ΄μ! π`;
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
  console.log(`[LOG] ->> fetch`);

  if (url.pathname === "/message.svg") {
    const params = url.searchParams;
    const name = params.get("name") ?? "(μ΄λ¦μμ)";
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
  console.log(`[BODY] ${JSON.stringify(body)}`);

  if (body?.title !== KAKAO_TITLE) {
    event.respondWith(createJsonResponse({}));
    return;
  }

  if (!body.message.includes("#μΈμ¦")) {
    event.respondWith(createJsonResponse({}));
    return;
  }

  // μ¬κΈ°μ λ­κ° μμν©λλ€.
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
// console.log(await writeDodoLog("μλ", "μ€μ€μ"));
