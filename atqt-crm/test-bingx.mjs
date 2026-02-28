import CryptoJS from "crypto-js";
import axios from "axios";
import JSONBig from "json-bigint";

const API_KEY    = "fZ7y98xLCmLIOI7O8KKjNfpFKwjes7eRujocUnU0JEsjnqNPbigva6PDUiVi5Wao8ndGYJEOYPkfTbAcnQA"
const API_SECRET = "dixp9UH5gdSh7F7gZGJyzXpa53qRlPtc67AcGzAwkQeedFLEtEwJ2UM5e4goNAYn4PYmctnp4LK4d29Sr9w"
const HOST = "open-api.bingx.com"
const API = {
    uri: "/openApi/spot/v1/account/balance",
    method: "GET",
    payload: {
        recvWindow: "6000"
    },
    protocol: "https"
}

function getParameters(API, timestamp, urlEncode) {
    let paramsObj = {}
    if (API.payload) {
        for (const key in API.payload) { paramsObj[key] = API.payload[key] }
    }
    paramsObj["timestamp"] = timestamp
    const sortedKeys = Object.keys(paramsObj).sort()
    let parameters = ""
    for (let i = 0; i < sortedKeys.length; i++) {
        if (i > 0) parameters += "&"
        const key = sortedKeys[i]
        let value = paramsObj[key]
        if (urlEncode) value = encodeURIComponent(value)
        parameters += key + "=" + value
    }
    return parameters
}

async function bingXOpenApiTest(protocol, host, path, method, API_KEY, API_SECRET) {
    const timestamp = new Date().getTime()
    const paramsStr = getParameters(API, timestamp, false)
    const sign = CryptoJS.enc.Hex.stringify(CryptoJS.HmacSHA256(paramsStr, API_SECRET))
    console.log("sign=" + sign)
    const url = protocol+"://"+host+path+"?"+getParameters(API, timestamp, true)+"&signature="+sign
    console.log("url=" + url)
    const config = {
        method: method,
        url: url,
        headers: { "X-BX-APIKEY": API_KEY },
        transformResponse: [(data) => {
            return JSONBig({ storeAsString: true }).parse(data);
        }]
    };
    const resp = await axios(config);
    console.log("demo:", JSON.stringify(resp.data, null, 2));
}

bingXOpenApiTest(API.protocol, HOST, API.uri, API.method, API_KEY, API_SECRET).catch(console.error)
