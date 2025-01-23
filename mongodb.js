import { MongoClient } from 'mongodb';

// Replace 'YOUR_ATLAS_CONNECTION_STRING' with your actual connection string
const url = "mongodb+srv://financeDB:finance321@finances.tks4sys.mongodb.net/?retryWrites=true&w=majority";
//const url = 'mongodb+srv://financeDB:finance321@finances.tks4sys.mongodb.net/';
const dbName = 'finance';
const dbCollection = 'people';
import papaparse from 'papaparse';
import fs from 'fs';

export async function main() {
  const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    // Connect to MongoDB Atlas
    await client.connect();

    console.log('Connected to MongoDB Atlas');

    // Access a specific database
    const db = client.db(dbName);

    // Access a specific collection
    const collection = db.collection(dbCollection);

    // Perform database operations here 
    //update spendings in database
    const result = await collection.updateOne({name: 'Johannsen'}, {$inc: {spendings:10}});
    
    if (result.matchedCount === 1 && result.modifiedCount === 1) {
        const updatedDocument = await collection.findOne({ name: 'Johannsen' });
        console.log('Document updated:', updatedDocument);
      } else {
        console.log('Document not updated.');
      }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    // Close the connection
    client.close();
  }
}

function connectDB(){
    const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
    try {
        client.connect();
        console.log('Connected to MongoDB atlas');
        return client;
    } catch(err){
        console.error('Error:',err);
    } 
}
function closeDB(){
    const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
    client.close;
    console.log("Closed DB");
}
export async function createAccount(chatId){
  //connect to db
  const client = connectDB();
  const db = client.db(dbName);
  const collection = db.collection(dbCollection);
  let message;

try {
  const query = { chatID: chatId }; // Example query to find the document
  
  const options = {
    upsert: true // Insert if not found
  };
  const document = await collection.findOne(query);

  if (document) {
      console.log('Existing document');
      message = "Account already exist!";
      
  } else {
      const update = {
          $set: { chatID: chatId},
          $set: { totalSpending: 0 }, // New or updated field
          $set: { expenses: []}
      };
      const result = await collection.updateOne(query, update, options);
      
      console.log('New document inserted:', result.upsertedId);
      message = "Account succesfully created!";
  }
  return message;
} catch (error) {
  console.error('Error updating/inserting document:', error);
} finally {
  closeDB();
}

}

export async function updateSpendings(chatId, spending){

    const client = connectDB();
    const db = client.db(dbName);

    // Access a specific collection
    const collection = db.collection(dbCollection);

    // Perform database operations here 
    //update spendings in database
    const result = await collection.updateOne({chatId: chatId.toString()}, {$inc: {spendings:spending}});
    
    if (result.matchedCount === 1 && result.modifiedCount === 1) {
        const updatedDocument = await collection.findOne({ chatId: chatId.toString()});
        console.log('Document updated:', updatedDocument);
      } else {
        console.log('Document not updated.');
      }
      
    closeDB();
}

export async function addSpending(chatID, description, amount) {
  const client = connectDB();

  try {
    const db = client.db(dbName);
    const dailyExpenses = 'dailyExpenses';
    //const weeklyExpenses = 'weeklyExpenses';
    const monthlyExpenses = 'monthlyExpenses';
    const yearlyExpenses = 'yearlyExpenses';
    const coldailyExpenses = db.collection(dailyExpenses);
    //const colweeklyExpenses = db.collection(weeklyExpenses);
    const colmonthlyExpenses = db.collection(monthlyExpenses);
    const colyearlyExpenses = db.collection(yearlyExpenses);
    const collection = db.collection(dbCollection);

    // Update document with daily spending entry
    const now = new Date();
    const day = now.getDay();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);

    const LastDayOfWeek = new Date(now);
    LastDayOfWeek.setDate(LastDayOfWeek.getDate() + (1 + 7 - (now.getDay() % 7)));// Set to end of the week
    LastDayOfWeek.setHours(0, 0, 0, 0); // Set to start of the day
    LastDayOfWeek.setUTCHours(LastDayOfWeek.getUTCHours() - 8); // Adjust to GMT+8
    
    const weekNumber = getWeekNumberInMonth(now);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    lastDayOfMonth.setHours(24, 0, 0, 0); // Set to end of the day

    const LastDayOfYear = new Date(now.getFullYear() + 1, 0, 1);
    LastDayOfYear.setHours(0, 0, 0, 0); // Set to start of the next year

    const filter = { chatID: chatID };
    
    //update month
    const updateDay = {
      $push: {
        expenses: {
          description: description,
          amount: amount,
          expireAt: midnight,
          addedAt: now,
        },
      },
      $inc: {
        totalSpending: amount,
      },
    };
    const updateMonth = {
      $push: {
        expenses: {
          description: description,
          amount: amount,
          expireAt: lastDayOfMonth,
          addedAt: now,
          week: weekNumber,
        },
      },
      $inc: {
        totalSpending: amount,
      },
    };
    const updateYear = {
      $push: {
        expenses: {
          description: description,
          amount: amount,
          expireAt: LastDayOfYear,
          monthNumber: now.getMonth() + 1,
        },
      },
      $inc: {
        totalSpending: amount,
      },
    };
    const updateAllTime = {
      $push: {
        expenses: {
          year: now.getFullYear(),
          months: [
            {
              month: now.getMonth() + 1, // Add 1 to get 1-based month number
              data: [
                {
                  description: description,
                  amount: amount,
                  date: now,
                },
              ],
            },
          ],
        },
      },
      $inc: {
        totalSpending: amount,
      },
    };
    
    //finished addWeeklySpendings do not delete
    await addWeeklySpending(chatID, day, description, amount, now, LastDayOfWeek, client);

    // Upsert: Create a new document if it doesn't exist for the chatID
    await coldailyExpenses.updateOne(filter, updateDay, { upsert: true });
    //await colweeklyExpenses.updateOne(filter, updateWeek, { upsert: true });
    await colmonthlyExpenses.updateOne(filter, updateMonth, { upsert: true });
    await colyearlyExpenses.updateOne(filter, updateYear, { upsert: true });
    await collection.updateOne(filter, updateAllTime, {upsert: true});

    console.log(`All spending added successfully for chatID: ${chatID}`);
  } catch(error){
    console.log(error);
  } finally {
     closeDB(client);
  }
}

async function addWeeklySpending(chatID, day, description, amount, date, expireTime, client) {
  try {
    const db = client.db(dbName);
    const collection = db.collection('weeklyExpenses');
    // Find the document with the given chatID
    const filter = { chatID: chatID };
    const existingDocument = await collection.findOne(filter);

    if (existingDocument) {
      // Document exists, find the sub-array for the given day
      const dayIndex = existingDocument.weeklyExpensesArray.findIndex((entry) => entry.day === day);

      if (dayIndex !== -1) {
        // Day sub-array exists, add the new expense
        const update = {
          $push: {
            [`weeklyExpensesArray.${dayIndex}.expenses`]: {
              description: description,
              amount: amount,
              date: date,
            },
          },
          $inc: {
            totalSpending: amount,
            [`weeklyExpensesArray.${dayIndex}.dailyExpenses`]: amount,
          },
        };

        await collection.updateOne(filter, update);
      } else {
        // Day sub-array does not exist, create a new one
        const newDayEntry = {
          day: day,
          expenses: [
            {
              description: description,
              amount: amount,
              date: date,
            },
          ],
          dailyExpenses: amount,
        };

        const update = {
          $push: {
            weeklyExpensesArray: newDayEntry,
          },
          $inc: {
            totalSpending: amount,
          },
        };

        await collection.updateOne(filter, update);
      }
    } else {
      // Document does not exist, create a new document with the day entry
      const newDocument = {
        chatID: chatID,
        weeklyExpensesArray: [
          {
            day: day,
            expenses: [
              {
                description: description,
                amount: amount,
                date: date,
              },
            ],
            dailyExpenses: amount,
          },
        ],
        totalSpending: amount,
        expireAt: expireTime,
      };

      await collection.insertOne(newDocument);
    }

    console.log('Weekly spending added successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    //closeDB(client);
  }
}

export async function getAllSpendingForChatID(chatID, time) {
  const client = connectDB();
  let name;
  if (time === 'allTimeExpenses'){
    return alltimeSpendings(chatID, client);
  } else {
    try {
      const db = client.db(dbName);
      const collectionName = time;
      const collection = db.collection(collectionName);
      // Retrieve all spending entries for a specific chatID
      const result = await collection.findOne({ chatID: chatID });
  
    //console.log(`All spending entries for chatID ${chatID}:`, result ? result.expenses : []);
    //console.log(`Total spending for chatID ${chatID}:`, result ? result.totalSpending : 0);
    //console.log(result ? result.expenses : `No Spendings in ${time}`); 
    if (time === 'dailyExpenses'){
      name = 'Daily Expenses';
    } else if (time === 'weeklyExpenses'){
      name = 'Weekly Expenses';
    } else if (time === 'monthlyExpenses'){
      name = 'Monthly Expenses';
    } else if (time === 'yearlyExpenses'){
      name = 'Yearly Expenses';
    } else {
      name = 'All Time Expenses'
    }
    
    return result ? `${name} : $${result.totalSpending}` : 'No Spendings';
    
  } catch(error){
      console.log(error);
    } finally {
        closeDB(client);
    }
  }
}

export async function alltimeSpendings(chatId, client){
  
  try{
    const db = client.db(dbName);

    // Access a specific collection
    const collection = db.collection(dbCollection);
  
    // Perform database operations here 
    //call spendings from database
    const result = await collection.findOne({chatId: chatId.toString()});
  
    if (result.chatId === chatId.toString()) {
        const spendings = result.spendings;
        console.log('spendings:', spendings);
        return `$${spendings}`;
      } else {
        console.log(result.chatId);
      }
  } finally {
    closeDB();
  }   
}

export async function getSummaryForChatID(chatID, time){
  const client = connectDB();

  if (time === 'allTimeExpenses'){
    //do this later
    //return alltimeSpendings(chatID, client);
  } else {
    try {
      const db = client.db(dbName);
      const collectionName = time;
      const collection = db.collection(collectionName);
  
      // Retrieve all spending entries for a specific chatID
      const result = await collection.findOne({ chatID: chatID });
  
    //console.log(`All spending entries for chatID ${chatID}:`, result ? result.expenses : []);
    //console.log(`Total spending for chatID ${chatID}:`, result ? result.totalSpending : 0);
    //console.log(result ? result.expenses : `No Spendings in ${time}`); 
    
    //result will be a array, how to deal with array? 
    //console.log(result);

    if (result){
      const chatID1 = result.chatID;
      const expenses = result.expenses || [];
      const totalSpending = result.totalSpending || new Decimal128(0);
      const formattedString = `\n${expenses.map(expense => `- ${expense.description}`).join('\n')}\n\nTotal Spending: $${totalSpending}`;
      //console.log(formattedString);

      return formattedString;
    } else {
      return 'No Spendings';
    }

    // Format the information into a string
    //

    // Now `formattedString` contains the information in a readable format
    //
    //return result ? result.totalSpending : 'No Spendings';

    } catch(error) {
      console.log(error);
    } finally {
        closeDB(client);
    }
  }
}

function getWeekNumberInMonth(date) {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfWeekFirstDay = firstDayOfMonth.getDay();
  const dayOfMonth = date.getDate();

  // Calculate the week number based on the day of the month and the day of the week of the first day
  const weekNumber = Math.floor((dayOfMonth + dayOfWeekFirstDay) / 7);

  return weekNumber;
}
export async function getDailyExpensesData(chatID){
  const client = connectDB();
  try {
    const db = client.db(dbName);
    const collectionName = 'dailyExpenses';
    const collection = db.collection(collectionName);
    const result = await collection.findOne({ chatID: chatID });
  if (result){
    const expenses = result.expenses || [];
    const totalSpending = result.totalSpending || new Decimal128(0);
    const formattedString = `Daily Expenses\n${expenses.map(expense => `- ${expense.description}`).join('\n')}\n\nTotal Spending: $${totalSpending}`;
    return formattedString;
  } else {
    return 'No Spendings';
  }
  } catch(error) {
    console.log(error);
  } finally {
      closeDB(client);
  }
}
export async function getWeeklyExpensesData(chatID) {
  const client = connectDB();

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('weeklyExpenses');

    // Replace the filter criteria based on your data structure
    const filter = { chatID: chatID };

    const result = await collection.findOne(filter);
    if (!result) {
      console.log('No weekly expenses data found.');
      return;
    }
    const formattedMessage = formatWeeklyExpenses(result);
    return formattedMessage;
  } finally {
    await client.close();
  }
}
export function formatWeeklyExpenses(data) {
  // Format the data into a readable message
  let message = 'Weekly Expenses:\n';

  data.weeklyExpensesArray.forEach((entry) => {
    message += `Day ${entry.day}:\n`;

    entry.expenses.forEach((expense) => {
      message += `- ${expense.description}: $${expense.amount}\n`;
    });

    message += `Total Daily Expenses: $${entry.dailyExpenses}\n\n`;
  });

  message += `Total Weekly Spendings: $${data.totalSpending}`;

  return message;
}









//creates collection run only once to create a collection with index TTL
/*
async function createCollection() {
  const client = connectDB();

  try {
    const db = client.db(dbName);
    const collectionName = 'yearlyReset';
    const collection = db.collection(collectionName);

    // Create TTL index on the 'expireAt' field for daily reset
    await collection.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 });

    console.log(`Collection "${collectionName}" with TTL index created successfully.`);
  } finally {
     closeDB();
  }
}
*/