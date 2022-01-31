require('dotenv').config();
const fetch = require('node-fetch').default;
const { products } = require('./products');

let offset = undefined;
const get_updates = async () => {
  try {
    const response = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/getUpdates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offset: offset,
      }),
    });
    const response_status = response.status;
    if (response_status === 200) {
      const response_json = await response.json();
      if (response_json instanceof Object) {
        if (response_json.result instanceof Array) {
          if (response_json.result.length > 0) {
            offset = response_json.result[response_json.result.length - 1].update_id + 1;
            response_json.result.forEach(async (item) => {
              if (item instanceof Object) {
                if (item.pre_checkout_query instanceof Object) {
                  const id = item.pre_checkout_query.id;

                  await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/answerPreCheckoutQuery`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      pre_checkout_query_id: id,
                      ok: true,
                    }),
                  });
                }
                if (item.message instanceof Object) {
                  if (item.message.successful_payment instanceof Object) {
                    const currency = item.message.successful_payment.currency;
                    const total_amount = item.message.successful_payment.total_amount;
                    const converted_amt = parseFloat(total_amount / 100).toFixed(2);
                    const user_id = item.message.chat.id;
                    const name = item.message.chat.first_name;

                    await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        chat_id: user_id,
                        text: `Thank you ${name} for paying ${currency}${converted_amt} @ Demo Cafe PH. Your order will arrive soon.`,
                      }),
                    });
                  } else if (item.message.text === '/menu') {
                    const id = item.message.chat.id;
                    push_menu(id);
                  }

                }
                if (item.inline_query instanceof Object) {
                  const query_id = item.inline_query.id;
                  const items = products.map((i, index) => {
                    const title = i.title;
                    const description = i.description;
                    const thumb_url = i.photo_url;
                    const payload = i.payload;
                    return {
                      type: 'article',
                      id: `id${index}`,
                      title: title,
                      description: description,
                      thumb_url: thumb_url,
                      thumb_width: 100,
                      thumb_height: 100,
                      input_message_content: {
                        title: title,
                        description: description,
                        payload: payload,
                        provider_token: process.env.STRIPE_TOKEN,
                        currency: 'PHP',
                        prices: i.price,
                        photo_url: thumb_url,
                        photo_size: 500,
                        photo_width: 500,
                        photo_height: 500,
                      },

                    };
                  });
                  await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/answerInlineQuery`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      inline_query_id: query_id,
                      results: items,
                    }),
                  });
                }

              }
            });
          }
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
  setTimeout(get_updates, 2500);
};

const push_menu = (id) => {
  products.forEach(async (item) => {
    await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendInvoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: id,
        title: item.title,
        description: item.description,
        payload: item.payload,
        provider_token: process.env.STRIPE_TOKEN,
        currency: 'PHP',
        prices: item.price,
        photo_url: item.photo_url,
        photo_size: 500,
        photo_width: 500,
        photo_height: 500,
      }),
    });
  });
};
process.nextTick(get_updates);
