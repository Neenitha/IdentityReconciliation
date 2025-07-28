/** Identity API Controllers **/

const db = require('../config/database');
const httpStatus = require('http-status');

// Format the result set from the provided DB results set
function formatResultSet(emails, phoneNumbers, secondaryContactIds, results) {
  let primaryId;
  for (let i = 0; i < results.rows.length; i++) {
    let rEmail = results.rows[i].email;
    let rPhoneNUmber = results.rows[i].phonenumber;

    if (rEmail && !emails.includes(rEmail))
      emails.push(rEmail);
    if (rPhoneNUmber && !phoneNumbers.includes(rPhoneNUmber))
      phoneNumbers.push(rPhoneNUmber);
    if (results.rows[i].linkprecedence == 'secondary' && !secondaryContactIds.includes(results.rows[i].id))
      secondaryContactIds.push(results.rows[i].id);
    if (results.rows[i].linkprecedence == 'primary')
      primaryId = results.rows[i].id;
  }

  var resultSet = {
    contact: {
      primaryContactId: primaryId,
      emails: emails,
      phoneNumbers: phoneNumbers,
      secondaryContactIds: secondaryContactIds
    }
  }

  return resultSet;
}

// Controller for identity POST request
const identityPOST = async ( req, res, next) => {
  try {
    const { phoneNumber, email } = req.body;

    var phResults = [];
    var emailResults = [];
    if (phoneNumber != null) {
      phResults = await db.query('SELECT id, phoneNumber, email, createdAt from CONTACT WHERE phoneNumber = $1 ORDER BY createdAt ASC LIMIT 1', [phoneNumber]);
      if (phResults.rowCount)
        var matchPhContacts = phResults.rows[0];
    }

    if (email != null) {
      emailResults = await db.query('SELECT id, phoneNumber, email, createdAt from CONTACT WHERE email = $1 ORDER BY createdAt ASC LIMIT 1', [email]);
      if (emailResults.rowCount)
        var matchEmailContacts = emailResults.rows[0];
    }

    var response;

    let createdAt = new Date();
    let updatedAt = new Date();

    var resultSet = [];
    var emails = [];
    var phoneNumbers = [];
    var secondaryContactIds = [];

    // If the email and phone matches to same contact just return the data.
    // If it matches to different contacts, depending on the created date, make
    // the latest one as secondary and return the result set
    if (phResults.rowCount && emailResults.rowCount) {
      if (matchPhContacts.id === matchEmailContacts.id) {
        response = await db.query('UPDATE CONTACT SET updatedAt = $1 WHERE id = $2', [updatedAt, matchPhContacts.id]);
        if (response.rowCount) {
          emails.push(email);
          phoneNumbers.push(phoneNumber);

          let results = await db.query('SELECT id, email, phoneNumber FROM CONTACT where id = $1', [matchPhContacts.id]);
          if (results.rowCount) {
            for (let i = 0; i < results.rows.length; i++) {
              let rEmail = results.rows[i].email;
              let rPhoneNUmber = results.rows[i].phonenumber;

              if (rEmail && !emails.includes(rEmail))
                emails.push(rEmail);
              if (rPhoneNUmber && !phoneNumbers.includes(rPhoneNUmber))
                phoneNumbers.push(rPhoneNUmber);
              secondaryContactIds.push(results.rows[i].id);
            }
          }

          resultSet = {
            contact : {
              primaryContactId: matchPhContacts.id,
              emails: emails,
              phoneNumbers : phoneNumbers,
              secondaryContactIds: secondaryContactIds
              }
          }
        }
        else
          throw err;
      }
      else {
        var updQuery = 'UPDATE CONTACT SET linkPrecedence = $1, linkedId = $2, updatedAt = $3 WHERE id = $4';
        let primaryId;
        if (new Date(matchPhContacts.createdat) < new Date(matchEmailContacts.createdat)) {
          response = await db.query(updQuery, ['secondary', matchPhContacts.id, updatedAt, matchEmailContacts.id]);
          primaryId = matchPhContacts.id;
          if (matchPhContacts.email)
            emails.push(matchPhContacts.email);
          phoneNumbers.push(phoneNumber);
        }
        else {
          response = await db.query(updQuery, ['secondary', matchEmailContacts.id, updatedAt, matchPhContacts.id]);
          primaryId = matchEmailContacts.id;
          if (matchEmailContacts.phonenumber)
            phoneNumbers.push(matchEmailContacts.phonenumber);
          emails.push(email);
        }
        if (!response.rowCount)
          throw err;
        let results = await db.query('SELECT id, email, phoneNumber FROM CONTACT where linkedId = $1', [primaryId])

        if (results.rowCount) {
          for (let i = 0; i < results.rows.length; i++) {
            let rEmail = results.rows[i].email;
            let rPhoneNUmber = results.rows[i].phonenumber;

            if (rEmail && !emails.includes(rEmail))
              emails.push(rEmail);
            if (rPhoneNUmber && !phoneNumbers.includes(rPhoneNUmber))
              phoneNumbers.push(rPhoneNUmber);
            secondaryContactIds.push(results.rows[i].id);
          }
        }

        resultSet = {
          contact : {
            primaryContactId: primaryId,
            emails: emails,
            phoneNumbers : phoneNumbers,
            secondaryContactIds: secondaryContactIds
            }
        }
  
      }
    }
    // If only the phone matches and email doesnt, create a new contact
    else if (phResults.rowCount) {
      if (email != null) {
        response =  await db.query('INSERT INTO CONTACT (phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt) values ($1, $2, $3, $4, $5, $6)', 
          [phoneNumber, email, matchPhContacts.id, 'secondary', createdAt, updatedAt]);
        if (!response.rowCount)
          throw err;
      }

      let results = await db.query('SELECT * FROM CONTACT where phoneNumber = $1 OR email = $2', [phoneNumber, matchPhContacts.email]);

      if (matchPhContacts.email)
        emails.push(matchPhContacts.email);
      phoneNumbers.push(matchPhContacts.phonenumber);

      if (results.rowCount) {
        resultSet = formatResultSet(emails, phoneNumbers, secondaryContactIds, results);
      }
    }
    // If only the email matches and phone doesnt, create a new contact
    else if (emailResults.rowCount) {
      if (phoneNumber != null) {
        response =  await db.query('INSERT INTO CONTACT (phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt) values ($1, $2, $3, $4, $5, $6)', 
          [phoneNumber, email, matchEmailContacts.id, 'secondary', createdAt, updatedAt]);
        if (!response.rowCount)
          throw err;
      }

      emails.push(matchEmailContacts.email);
      if (matchEmailContacts.phonenumber)
        phoneNumbers.push(matchEmailContacts.phonenumber);

      let results = await db.query('SELECT * FROM CONTACT where email = $1 OR phoneNumber = $2', [email, matchEmailContacts.phonenumber]);
      if (results.rowCount) {
        resultSet = formatResultSet(emails, phoneNumbers, secondaryContactIds, results);
      }
    }
    // If neither phone nor email matches, create a new contact and return the result
    else {
      response =  await db.query('INSERT INTO CONTACT (phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt) values ($1, $2, $3, $4, $5, $6)', 
        [phoneNumber, email, null, 'primary', createdAt, updatedAt]);
      if (!response.rowCount)
        throw err;


      if (phoneNumber && email) {
        var result = await db.query('SELECT id, email, phoneNumber FROM CONTACT where phoneNumber = $1 AND email = $2', [phoneNumber, email]);
        phoneNumbers.push(phoneNumber);
        emails.push(email);
      }
      else if (phoneNumber) {
        result = await db.query('SELECT id, email, phoneNumber FROM CONTACT where phoneNumber = $1', [phoneNumber]);
        phoneNumbers.push(phoneNumber);
      }
      else if (email) {
        result = await db.query('SELECT id, email, phoneNumber FROM CONTACT where email = $1', [email]);
        emails.push(email);
      }

      resultSet = {
        contact: {
          primaryContactId: result.rows[0].id,
          emails: emails,
          phoneNumbers: phoneNumbers,
          secondaryContactIds: secondaryContactIds
        }
      }
    }

    res.status(httpStatus.status.OK).send(resultSet);
  }
  catch (err) {
    next(err);
  }
}

module.exports = {
  identityPOST
}
