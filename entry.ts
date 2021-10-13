
const KAKAO_TITLE = '두두운영진테스트'


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
  let body = null
  try {
    body = await event.request.json()
  } catch {}

  const title = body.title ?? '(Empty)'
  if (title !== KAKAO_TITLE) {
    event.respondWith(createJsonResponse({}));
    return
  }

  const name = body.name ?? '(Empty)'
  const message = body.message ?? '(Empty)'
  // 여기서 뭔가 작업합니다.

  event.respondWith(createJsonResponse({
    // reply: `안녕하세여! ${name}님!`,
  }))
});
