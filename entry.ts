import { NotiflowBody } from './notiflow.ts'

const KAKAO_TITLE = '두두운영진테스트'

// https://www.notion.so/wan2land/2c5e7017d0604fcf9deeb9bd1ab5db6e?v=35912fbf6be8492b906f9cfba60ea351
const NOTION_DATABASE = '2c5e7017d0604fcf9deeb9bd1ab5db6e'
const WEEKS: [from: string, to: string][] = [
  ['2021-10-11', '2021-10-17'],
  ['2021-10-18', '2021-10-24'],
  ['2021-10-25', '2021-10-31'],
]

const NOTION_SECRET = Deno.env.get('NOTION_SECRET')

async function writeDodoLog(name: string, content: string): Promise<string> {
  const today = new Date()
    .toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })
    .replace(/\.\s*/g, '-')
    .replace(/-+$/, '')

  const weekIndex = WEEKS.findIndex(
    ([from, to]) => from <= today && today <= to
  )
  if (weekIndex < 0) {
    return '인증기간이 끝났어요. 다음번 두두에 만나요! 뿅 🐹'
  }
  
  const db = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_SECRET}`,
      'Notion-Version': '2021-08-16'
    }
  }).then((response) => response.json())
  
  const result = db.results.find((result: any) => {
    try {
      return result.properties.Name.title[0].plain_text === name
    } catch {
      return false
    }
  })

  if (!result) {
    return '목표달성표에서 찾지 못했어요. 닉네임 확인 부탁드려요. 🥲'
  }

  {
    // Week 증가시키기
    const weekName = `${weekIndex + 1}주차`

    // weekText like '0/5'
    const weekText: string = (result.properties[weekName]?.rich_text[0]?.plain_text ?? '0/?')
    const nextWeekText = weekText.replace(/([^\d]|^)(\d+)\/(\d*)[ ]*/, (_, prefix, count, total) => {
      const countInt = parseInt(count) + 1
      const totalInt = parseInt(total)
      const complete = !isNaN(totalInt) && countInt >= totalInt ? ' 🎉' : ''
      return `${prefix}${countInt}/${total}${complete}`
    })

    await fetch(`https://api.notion.com/v1/pages/${result.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${NOTION_SECRET}`,
        'Notion-Version': '2021-08-16',
        'Content-Type': 'application/json',
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
              }
            ]
          }
        },
      }),
    }).then((response) => response.json())
    return `${name}님! ${weekName} 인증이 완료되었어요! 😎`
  }

  // const page = await fetch(`https://api.notion.com/v1/pages/${result.id}`, {
  //   headers: {
  //     'Authorization': `Bearer ${SECRET}`,
  //     'Notion-Version': '2021-08-16'
  //   }
  // }).then((response) => response.json())

  // console.log(JSON.stringify(page, null, '  '))
  


  // console.log(JSON.stringify(result, null, '  '))

}

function createJsonResponse(json: any) {
  return new Response(JSON.stringify(json), {
    status: 200,
    headers: {
      server: "deploy",
      "content-type": "application/json; charset=UTF-8"
    },
  })
}

addEventListener("fetch", async (event) => {
  let body = null as NotiflowBody | null
  try {
    body = await event.request.json()
  } catch {}

  if (body?.title !== KAKAO_TITLE) {
    event.respondWith(createJsonResponse({}));
    return
  }

  console.log(`[BODY] ${JSON.stringify(body)}`)

  if (!body.message.includes('#인증')) {
    event.respondWith(createJsonResponse({}));
    return
  }

  // 여기서 뭔가 작업합니다.
  const reply = await writeDodoLog(body.name, body.message)

  event.respondWith(createJsonResponse({
    reply,
  }))
});

// console.log('->', await writeDodoLog('완두', '옿옿옿옹'))
