import { Controller, Post, Body } from '@nestjs/common';
import { JsonProperty, JsonObject, JsonConvert } from 'json2typescript';

@JsonObject("Header")
class Header {
    @JsonProperty("name", String)
    name: string = "";

    @JsonProperty("value", String)
    value: string = "";
}

@JsonObject("CommonHeaders")
class CommonHeaders {
    @JsonProperty("returnPath", String)
    returnPath: string = "";

    @JsonProperty("from", [String])
    from: string[] = [];

    @JsonProperty("date", String)
    date: string = "";

    @JsonProperty("to", [String])
    to: string[] = [];

    @JsonProperty("messageId", String)
    messageId: string = "";

    @JsonProperty("subject", String)
    subject: string = "";
}

@JsonObject("Mail")
class Mail {
    @JsonProperty("timestamp", String)
    timestamp: string = "";

    @JsonProperty("source", String)
    source: string = "";

    @JsonProperty("messageId", String)
    messageId: string = "";

    @JsonProperty("destination", [String])
    destination: string[] = [];

    @JsonProperty("headersTruncated", Boolean)
    headersTruncated: boolean = false;

    @JsonProperty("headers", [Header])
    headers: Header[] = [];

    @JsonProperty("commonHeaders", CommonHeaders)
    commonHeaders: CommonHeaders = new CommonHeaders();
}

@JsonObject("Action")
class Action {
    @JsonProperty("type", String)
    type: string = "";

    @JsonProperty("topicArn", String)
    topicArn: string = "";
}

@JsonObject("Verdict")
class Verdict {
    @JsonProperty("status", String)
    status: string = "";
}

@JsonObject("Receipt")
class Receipt {
    @JsonProperty("timestamp", String)
    timestamp: string = "";

    @JsonProperty("processingTimeMillis", Number)
    processingTimeMillis: number = 0;

    @JsonProperty("recipients", [String])
    recipients: string[] = [];

    @JsonProperty("spamVerdict", Verdict)
    spamVerdict: Verdict = new Verdict();

    @JsonProperty("virusVerdict", Verdict)
    virusVerdict: Verdict = new Verdict();

    @JsonProperty("spfVerdict", Verdict)
    spfVerdict: Verdict = new Verdict();

    @JsonProperty("dkimVerdict", Verdict)
    dkimVerdict: Verdict = new Verdict();

    @JsonProperty("dmarcVerdict", Verdict)
    dmarcVerdict: Verdict = new Verdict();

    @JsonProperty("dmarcPolicy", String)
    dmarcPolicy: string = "";

    @JsonProperty("action", Action)
    action: Action = new Action();
}

@JsonObject("Ses")
class Ses {
    @JsonProperty("receipt", Receipt)
    receipt: Receipt = new Receipt();

    @JsonProperty("mail", Mail)
    mail: Mail = new Mail();
}

@JsonObject("Record")
class Record {
    @JsonProperty("eventVersion", String)
    eventVersion: string = "";

    @JsonProperty("ses", Ses)
    ses: Ses = new Ses();

    @JsonProperty("eventSource", String)
    eventSource: string = "";
}

@JsonObject("Root")
class Root {
    @JsonProperty("Records", [Record])
    Records: Record[] = [];
}

class ResponseDTO {
    spam: boolean;
    virus: boolean;
    dns: boolean;
    mes: string;
    retrasado: boolean;
    emisor: string;
    receptor: string[];

    constructor(spam: boolean, virus: boolean, dns: boolean, mes: string, retrasado: boolean, emisor: string, receptor: string[]) {
        this.spam = spam;
        this.virus = virus;
        this.dns = dns;
        this.mes = mes;
        this.retrasado = retrasado;
        this.emisor = emisor;
        this.receptor = receptor;
    }
}

@Controller('emails')
export class EmailsController {
    @Post()
    handleEmail(@Body() body: any): ResponseDTO {
        const jsonConvert: JsonConvert = new JsonConvert();
        const root: Root = jsonConvert.deserializeObject(body, Root);

        const record = root.Records[0];
        const ses = record.ses;
        const receipt = ses.receipt;
        const mail = ses.mail;

        const spam = receipt.spamVerdict.status === "PASS";
        const virus = receipt.virusVerdict.status === "PASS";
        const dns = receipt.spfVerdict.status === "PASS" && receipt.dkimVerdict.status === "PASS" && receipt.dmarcVerdict.status === "PASS";
        const mes = new Date(mail.timestamp).toLocaleString('default', { month: 'long' });
        const retrasado = receipt.processingTimeMillis > 1000;
        const emisor = mail.source.split('@')[0];
        const receptor = mail.destination.map(email => email.split('@')[0]);

        return new ResponseDTO(spam, virus, dns, mes, retrasado, emisor, receptor);
    }
}