const fs = require('fs');
const path = require('path');

// 正确的密码哈希 (password = '123456', rounds = 10)
const passwordHashes = {
  "m001": "$2b$10$TxE1WyVWkVWQMW2SqH.PK.fW5w4AdyL4YtGbMEOKNBctqmKyPIBF.",
  "m002": "$2b$10$SbnTgor/RGhnhfqn4IKThedsipEVusLOO0mipLhnv7u3pvfPe7hyi",
  "m003": "$2b$10$ljJAor.T.LdlCHWzvow0XOjM7re36toCdE2Gkizzgj4mf0d2/X81O",
  "m004": "$2b$10$FbCvoHiG5Dbgdleqm2XOiu776xozOqxPo6dT9t6.0aulCa/pPLWe",
  "m005": "$2b$10$s9pBqObc/NAwBpyB0xURv.ufSxfrUNutmp3/TDa6Kuqx0MPr66KZq",
  "m006": "$2b$10$nY7oA7aYx0IDPQHGD0vqBOK3RH3/7N.41FZPM43na55RKsE4XXiM2",
  "gm001": "$2b$10$gUs7RvLBd5DWQOUqdQ4J1u2hh..5lTwgmwcRFuHtCecnzfTLT58zi",
  "hr001": "$2b$10$vxXXasX7DBY2OBn/ksg6wuMBrW3MuPeRRKk8sd9A3GYJLdTGwHXv.",
  "hr002": "$2b$10$vxXXasX7DBY2OBn/ksg6wuMBrW3MuPeRRKk8sd9A3GYJLdTGwHXv.",
  "e001": "$2b$10$JmMrnYURoGc7iDkBlNCINeUFeAcPs0558TqOOyrF5lYePahlKjvWa",
  "e002": "$2b$10$52E5OAGQ5QqXxbSU3CRrEuKrVak.pJoTKEUVG2e.GulQrvNQNH75K",
  "e003": "$2b$10$G72aJsaokXDYEClX/LwWHOZ9M3fBuqjhEMffPrS1T2B2oRQtd88dC",
  "e004": "$2b$10$IK0UPUMT9VPvXee2W8DD8uihLUkP6DYBrAYHl4g21uMLH1yilAWwq",
  "e005": "$2b$10$rOy3KSRGSbcoH6mMJ2A2vOHrMLZxvorrutnW6dctzy.IdD96z06q2",
  "e006": "$2b$10$oDjbm2BSxC3KRtz76DtiTuVyYS/u.JfbmlMDcJyUSYMDELDAjrAM",
  "e007": "$2b$10$7XfoarTfcP1KHsfFP/U3CeZKMSOqPfC.3gWfTB0GgJHLModLGTTjW",
  "e008": "$2b$10$Ej7ypAb4M72XUHnKLM3qiOU0giPUNZ3DVCv2bBfS1ek0MDaHcNDoe",
  "e009": "$2b$10$oFDZjoUfqG4UVXeBxUZkROMtgYoKHyIUummNL5GotzpBPT4RT0vC2",
  "e010": "$2b$10$btHHYxca71iPbmGgRHhlpuTU4zc3j.cvtlrJwhgBTAKNmoN1Ay5UC",
  "e011": "$2b$10$U6Ci4SYcmRdaBe/mmbv0S.RWklNBmD6w6UH5L73aUW4nOB8AO7Pl.",
  "e012": "$2b$10$0qYLTEt7A2H.v724uiRlZ.ZkOtZVS3eU0cFY3sDhbzykzbo1o9a9i",
  "e013": "$2b$10$OHCI9WCwTayX5kD6P3yb9uwFzRM23bDjQjk1nFOoX490pqMh7lxFq",
  "e014": "$2b$10$QAjTpCTnHbjD58gM29T9H.62sniyE1/N.7w5rDRuSN22vaxN9BvBm",
  "e015": "$2b$10$XvTBY4K/IgZCJOiauVehw.BgqR0Ld8cznJHj/MsH8qkrvIrK7GSe",
  "e016": "$2b$10$eHc3bdvr2zrZUrOGELh6R.CvkUpkR6OeOMNxrrqEURPJ73FYJkM/S",
  "e017": "$2b$10$.2ziH1KSF0WdtC3h3dGltedT/wIVWT5tXkohLGTNGZ8CAuu47QTKO",
  "e018": "$2b$10$oA1JJR2LFYT/qC7xh2W28u5OAwA3luCPnMBLCi/2R91dOdo.ZnRJO",
  "e019": "$2b$10$su2ilVhphCVfuXvu4TqcS.9/72Unix6.Pq.adKoxDXTFh2VLCrMz6",
  "e020": "$2b$10$v/f70pr9MhvEr.nOkU9hueU7HnvpDEBgHV4QZmsaR0WqmxcXNa95G",
  "e021": "$2b$10$xhyCYzItgrk9ajRL3Uc2UORLhNQIVVWY6wNTCx/EYbFxBEX6.yZiq",
  "e022": "$2b$10$oXK.7IFpR8QQHyUU1oPqmuiuzXMGg0M7kv.cgiTlMOVyz6kbC6n2e",
  "e023": "$2b$10$HYN654j46UpAGJJVtiQ/3.uaY7lzIPa.zj8VGpzXzaCBlO/vOW7Ja",
  "e024": "$2b$10$NSh/rK/GD7AZWIrKoRDHEeqVtkgiSq6CI0GVXv5GWvt2YFBckTeJy",
  "e025": "$2b$10$29keFVDT/ZOUJ5rDpAf.TemWl/oE4zl.iSkuRDdIZmLuCh2E74Lgu",
  "e026": "$2b$10$daGqYLY1kY4UfjQumsc.COpTNOalscS3dc63rl2jlMztWb.ygqQIi",
  "e027": "$2b$10$UCM3l2U5wbVWpT8sbZAcuCGlJEyp7rDYX3lvv1tAgWwIvOoS82ou",
  "e028": "$2b$10$OvY4Us4izqDuzki42LRbzO.Piuu3wY4.y7ODbLWtk88j/dNg6N02",
  "e029": "$2b$10$JNKJnhz2W49vOTQUXd3PMuEnwqYQaS/HvJ1sxutcOP53Lux5DS52W",
  "e030": "$2b$10$Jo9dXH3D/gRAtUH1P6BvJe2jKJF140BkTWqcR0L.F.haYeyXS7jA2",
  "e031": "$2b$10$Fj45bPkzVH73.syF3N4JsOp/wVJPtEysomgAfQSVabei8NB1ON9I2",
  "e032": "$2b$10$NL9y3rHMxUSJdws2.9CfyOVhdsN1PuLk0H2cQdB5GmbiBRSgsTfPe",
  "e033": "$2b$10$n3vHVuAyfrRkpez/kiseAOF8enEjUcgNeVboxCqfe6ElH6AilkbPS",
  "e034": "$2b$10$5xw3qU3MDVeKnPXImDr0ceJ7.I.U9T5chKrOdvV4tMC5QO6swQ74pm",
  "e035": "$2b$10$6DpI2iC4ZeLRe4gKMCEJouwJ3KrLtNiRg.lIOmHuHq/uLo0mM6jx"
};

// 读取 memory-db.ts 文件
const memoryDbPath = path.join(__dirname, '../src/config/memory-db.ts');
let content = fs.readFileSync(memoryDbPath, 'utf8');

// 替换密码哈希
Object.keys(passwordHashes).forEach(id => {
  const oldPassword = passwordHashes[id].replace(/\$/g, '\\$');
  const newPassword = passwordHashes[id].replace(/\$/g, '\\$');

  // 查找该员工并替换密码
  const regex = new RegExp(`\\{ id: '${id}', name: '[^']+', password: '[^']+\\}`, 'g');
  content = content.replace(regex, (match) => {
    const nameMatch = match.match(/name: '([^']+)'/);
    if (nameMatch) {
      return `{ id: '${id}', name: '${nameMatch[1]}', password: '${newPassword}'}`;
    }
    return match;
  });
});

// 写回文件
fs.writeFileSync(memoryDbPath, content, 'utf8');

console.log('✅ 已更新 memory-db.ts 中的密码哈希');
console.log('📝 所有员工密码: 123456');
console.log('🔐 哈希算法: bcrypt(10)');
