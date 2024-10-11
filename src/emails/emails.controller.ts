import { Controller, Post, Body } from '@nestjs/common';
import { JsonProperty, JsonObject, JsonConvert } from 'json2typescript';

/**
 * Class representing a header in the email.
 */
@JsonObject('Header')
class Header {
  @JsonProperty('name', String)
  name: string = ''; // Name of the header (e.g., "From")

  @JsonProperty('value', String)
  value: string = ''; // Value of the header (e.g., email address)
}

/**
 * Class representing common headers in the email.
 */
@JsonObject('CommonHeaders')
class CommonHeaders {
  @JsonProperty('returnPath', String)
  returnPath: string = ''; // Return path email address

  @JsonProperty('from', [String])
  from: string[] = []; // List of "From" email addresses

  @JsonProperty('date', String)
  date: string = ''; // Date the email was sent

  @JsonProperty('to', [String])
  to: string[] = []; // List of "To" email addresses

  @JsonProperty('messageId', String)
  messageId: string = ''; // Unique message ID

  @JsonProperty('subject', String)
  subject: string = ''; // Subject of the email
}

/**
 * Class representing the metadata and details of the email.
 */
@JsonObject('Mail')
class Mail {
  @JsonProperty('timestamp', String)
  timestamp: string = ''; // Timestamp of when the email was received

  @JsonProperty('source', String)
  source: string = ''; // The email address that sent the email

  @JsonProperty('messageId', String)
  messageId: string = ''; // Unique message ID

  @JsonProperty('destination', [String])
  destination: string[] = []; // List of recipient email addresses

  @JsonProperty('headersTruncated', Boolean)
  headersTruncated: boolean = false; // Whether headers were truncated

  @JsonProperty('headers', [Header])
  headers: Header[] = []; // List of headers in the email

  @JsonProperty('commonHeaders', CommonHeaders)
  commonHeaders: CommonHeaders = new CommonHeaders(); // Common headers object
}

/**
 * Class representing the action taken on the email (e.g., SNS notification).
 */
@JsonObject('Action')
class Action {
  @JsonProperty('type', String)
  type: string = ''; // Type of action (e.g., "SNS")

  @JsonProperty('topicArn', String)
  topicArn: string = ''; // Topic ARN for SNS
}

/**
 * Class representing the verdict of email checks (e.g., spam, virus).
 */
@JsonObject('Verdict')
class Verdict {
  @JsonProperty('status', String)
  status: string = ''; // Status of the check (e.g., "PASS" or "FAIL")
}

/**
 * Class representing the receipt details of the email (e.g., verdicts and processing time).
 */
@JsonObject('Receipt')
class Receipt {
  @JsonProperty('timestamp', String)
  timestamp: string = ''; // When the email was processed

  @JsonProperty('processingTimeMillis', Number)
  processingTimeMillis: number = 0; // Processing time in milliseconds

  @JsonProperty('recipients', [String])
  recipients: string[] = []; // List of recipients

  @JsonProperty('spamVerdict', Verdict)
  spamVerdict: Verdict = new Verdict(); // Verdict for spam check

  @JsonProperty('virusVerdict', Verdict)
  virusVerdict: Verdict = new Verdict(); // Verdict for virus check

  @JsonProperty('spfVerdict', Verdict)
  spfVerdict: Verdict = new Verdict(); // Verdict for SPF check

  @JsonProperty('dkimVerdict', Verdict)
  dkimVerdict: Verdict = new Verdict(); // Verdict for DKIM check

  @JsonProperty('dmarcVerdict', Verdict)
  dmarcVerdict: Verdict = new Verdict(); // Verdict for DMARC check

  @JsonProperty('dmarcPolicy', String)
  dmarcPolicy: string = ''; // DMARC policy

  @JsonProperty('action', Action)
  action: Action = new Action(); // Action taken on the email
}

/**
 * Class representing the SES email data (e.g., receipt and mail).
 */
@JsonObject('Ses')
class Ses {
  @JsonProperty('receipt', Receipt)
  receipt: Receipt = new Receipt(); // Email receipt details

  @JsonProperty('mail', Mail)
  mail: Mail = new Mail(); // Email metadata and content
}

/**
 * Class representing an individual SES event record.
 */
@JsonObject('Record')
class Record {
  @JsonProperty('eventVersion', String)
  eventVersion: string = ''; // Version of the event

  @JsonProperty('ses', Ses)
  ses: Ses = new Ses(); // SES event data (receipt and mail)

  @JsonProperty('eventSource', String)
  eventSource: string = ''; // Source of the event
}

/**
 * Class representing the root event object, containing multiple SES event records.
 */
@JsonObject('Root')
class Root {
  @JsonProperty('Records', [Record])
  Records: Record[] = []; // Array of SES event records
}

/**
 * Data Transfer Object (DTO) for response data.
 *
 * @param spam - Whether the email passed the spam check
 * @param virus - Whether the email passed the virus check
 * @param dns - Whether the email passed SPF, DKIM, and DMARC checks
 * @param mes - The month the email was received
 * @param retrasado - Whether the email was delayed (processing time > 1000ms)
 * @param emisor - The sender's email username
 * @param receptor - List of recipient email usernames
 */
class ResponseDTO {
  spam: boolean;
  virus: boolean;
  dns: boolean;
  mes: string;
  retrasado: boolean;
  emisor: string;
  receptor: string[];

  constructor(
    spam: boolean,
    virus: boolean,
    dns: boolean,
    mes: string,
    retrasado: boolean,
    emisor: string,
    receptor: string[],
  ) {
    this.spam = spam;
    this.virus = virus;
    this.dns = dns;
    this.mes = mes;
    this.retrasado = retrasado;
    this.emisor = emisor;
    this.receptor = receptor;
  }
}

/**
 * Controller for handling email POST requests.
 */
@Controller('emails')
export class EmailsController {
  /**
   * Handles incoming email event data from SES and processes it into a response DTO.
   *
   * @param body - The incoming event data in the request body
   * @returns A ResponseDTO with processed email information
   */
  @Post()
  handleEmail(@Body() body: any): ResponseDTO {
    const jsonConvert: JsonConvert = new JsonConvert();
    const root: Root = jsonConvert.deserializeObject(body, Root);

    const record = root.Records[0]; // Get the first record
    const ses = record.ses;
    const receipt = ses.receipt;
    const mail = ses.mail;

    const spam = receipt.spamVerdict.status === 'PASS'; // Check if email passed spam check
    const virus = receipt.virusVerdict.status === 'PASS'; // Check if email passed virus check
    const dns =
      receipt.spfVerdict.status === 'PASS' &&
      receipt.dkimVerdict.status === 'PASS' &&
      receipt.dmarcVerdict.status === 'PASS'; // Check DNS-related verdicts
    const mes = new Date(mail.timestamp).toLocaleString('default', {
      month: 'long',
    }); // Convert timestamp to month name
    const retrasado = receipt.processingTimeMillis > 1000; // Check if processing took more than 1000 ms
    const emisor = mail.source.split('@')[0]; // Get the sender's email username
    const receptor = mail.destination.map((email) => email.split('@')[0]); // Get recipient usernames

    return new ResponseDTO(spam, virus, dns, mes, retrasado, emisor, receptor);
  }
}
