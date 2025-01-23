import TelegramBot from 'node-telegram-bot-api';
const token = '6436803662:AAE-kmT1NNMw0FltwCH2Jl5b6kAfUbNJXBs';
import * as mongodb from '/Users/johannsenlum/Projects/expense-tracker-bot/mongodb.js';
import { Decimal128 } from 'bson';

const bot = new TelegramBot(token, {polling: true});

bot.onText(/\/create/, (msg) => {  
    // 'msg' is the received Message from Telegram
    //creates an account in MongoDB if not yet created
    (async() => {
        try {
            const chatId = msg.chat.id;
      bot.sendMessage(chatId, 'test');
      const message =await mongodb.createAccount(chatId);
  
    // send outcome of account creation
      bot.sendMessage(chatId, message);
        }
        catch(error){
            console.error('Error', error);
        }
    })();
  });

//spent function -> user spent $x on y
bot.onText(/\/spent (.+)/, (msg) => {  
    // 'msg' is the received Message from Telegram
    const chatId = msg.chat.id;
    const msgArray = msg.text.toString().split(" ");
    const msgSpending = msgArray[1];
    const msgArray2 = msgArray;
    let numericalValue = msgSpending.slice(1);

    if (!isNaN(numericalValue) && msgSpending.length != 1) {
      console.log(numericalValue); // Output: 5
      bot.sendMessage(chatId, "Spent $"+ numericalValue + " on " + (msgArray2.slice(2,msgArray2.length)).join(' '));
      //mongodb.updateSpendings(chatId,Decimal128.fromString(numericalValue));
      mongodb.addSpending(chatId, msg.text.slice(7), Decimal128.fromString(numericalValue));
    } else {
      console.log("Unable to extract a valid number from the string.");
    }
    
});

bot.onText(/\/spendings/, (msg) => {
  const chatId = msg.chat.id;

  // Define your keyboard options
  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Daily', callback_data: 'dailyExpenses' }],
        [{ text: 'Weekly', callback_data: 'weeklyExpenses' }],
        [{ text: 'Monthly', callback_data: 'monthlyExpenses' }],
        [{ text: 'Yearly', callback_data: 'yearlyExpenses' }],
        [{ text: 'All Time', callback_data: 'allTimeExpenses' }],
        [{ text: 'Cancel', callback_data: 'Cancel'}],
      ]
    }
  };
  // Send a message with the inline keyboard
  bot.sendMessage(chatId, 'Which Expenses Do You Want To View?', options);
});

bot.onText(/\/summary/, (msg) => {  
  const chatId = msg.chat.id;

  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Daily', callback_data: 'summaryDaily' }],
        [{ text: 'Weekly', callback_data: 'summaryWeekly' }],
        [{ text: 'Monthly', callback_data: 'summaryMonthly' }],
        [{ text: 'Yearly', callback_data: 'summaryYearly' }],
        [{ text: 'All Time', callback_data: 'summaryAllTime' }],
        [{ text: 'Cancel', callback_data: 'Cancel'}],
      ]
    }
  };
  // Send a message with the inline keyboard
  bot.sendMessage(chatId, 'Which Summary Do You Want To View?', options);
});


bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const data = callbackQuery.data;

  if(data != 'Cancel'){
    try {
      let result;
      //Handle expenses options
      if (data.startsWith('daily') || data.startsWith('weekly') || data.startsWith('monthly') || data.startsWith('yearly') || data === 'allTimeExpenses') {
        result = await mongodb.getAllSpendingForChatID(chatId, data);
      }
      // Handle summary options
      else if (data.startsWith('summary')) {
        if(data === 'summaryDaily'){
          //Done!
          result = await mongodb.getDailyExpensesData(chatId);
        } else if (data === 'summaryWeekly'){
          //Done!
          result = await mongodb.getWeeklyExpensesData(chatId);
        } else if (data === 'summaryMonthly'){
          //change this
          result = await mongodb.getSummaryForChatID(chatId, 'monthlyExpenses');
        } else if (data === 'summaryYearly'){
          //change this
          result = await mongodb.getSummaryForChatID(chatId, 'yearlyExpenses');
        } else {
          //change this
          result = await mongodb.getSummaryForChatID(chatId, 'allTimeExpenses');
        }
      }

      if (result && result != 'No Spendings') {
        //const formattedResult = `${data} : ${result}`;
        bot.editMessageText(result, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [] } // Empty inline_keyboard to remove the keyboard
        });
      } else {
        const formattedResult = `No spendings data found in ${data}`;
        bot.editMessageText(formattedResult, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [] } // Empty inline_keyboard to remove the keyboard
        });
      }
    } catch (error) {
      bot.sendMessage(chatId, 'An error occurred while fetching spending data.');
    }
    
  } else {
    bot.editMessageText('Cancelled!', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: [] } // Empty inline_keyboard to remove the keyboard
    });
  }
});



/*
// Handle button clicks
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const data = callbackQuery.data;
  console.log(data);

  if(data != 'Cancel'){
    try {
      let result = await mongodb.getAllSpendingForChatID(chatId, data);

      if (result && result != 'No Spendings') {
        const formattedResult = `${data} : $${result}`;
        bot.editMessageText(formattedResult, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [] } // Empty inline_keyboard to remove the keyboard
        });
      } else {
        const formattedResult = `No spendings data found in ${data}`;
        bot.editMessageText(formattedResult, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [] } // Empty inline_keyboard to remove the keyboard
        });
      }
    } catch (error) {
      bot.sendMessage(chatId, 'An error occurred while fetching spending data.');
    }
    
  } else {
    bot.editMessageText('Cancelled!', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: [] } // Empty inline_keyboard to remove the keyboard
    });
  }

  //bot.sendMessage(chatId, `You selected: ${data}`);
});
*/




//test functions
/*
bot.onText(/\/test/, (msg) => {  
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message
  const chatId = msg.chat.id;
  const msgArray = msg.text.toString().split(" ");
  const msgSpending = msgArray[1];
  const msgArray2 = msgArray;
  //console.log(typeof chatId);

  //bot.sendMessage(chatId, "Spent $"+ msgSpending + " on " + (msgArray2.slice(2,msgArray2.length)).join(' '));
  mongodb.testDatetype();
  
  // send back the matched "whatever" to the chat
  //bot.sendMessage(chatId, chatId);
  //bot.sendPhoto(chatId,"download.png")
});
bot.onText(/\/spendingsTest/, (msg) => {  

    //return summary 
    (async() => {
        try {
            const chatId = msg.chat.id;
            const message = "You have spent $" + await mongodb.alltimeSpendings(chatId) + " today!" ;
            
    // send outcome of account creation
      bot.sendMessage(chatId, message);
        }
        catch(error){
            console.error('Error', error);
        }
    })();
  });
bot.onText(/\/echo(.+)/, (msg, match) => {  
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message

    const chatId = msg.chat.id;

    const resp = match[1]; // the captured "whatever"

  // send back the matched "whatever" to the chat
    bot.sendMessage(chatId, chatId);
    bot.sendPhoto(chatId,"download.png")
});
*/