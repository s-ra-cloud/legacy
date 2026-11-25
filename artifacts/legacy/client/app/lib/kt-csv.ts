/** Incremental RFC-4180 reader. Never buffers a whole decompressed archive. */
export async function* readKTCsv(chunks: AsyncIterable<string>): AsyncGenerator<string[]> {
  let row:string[]=[], field="", quoted=false, afterQuote=false, skipLF=false, first=true;
  function take() { row.push(field); field=""; if(row.length>100) throw new Error("Too many CSV columns."); }
  for await (let chunk of chunks) {
    if(first && chunk.length) { chunk=chunk.replace(/^\uFEFF/,"");first=false; }
    for(const ch of chunk) {
      if(skipLF) { skipLF=false; if(ch==="\n") continue; }
      if(quoted) {
        if(ch==='"') { quoted=false;afterQuote=true; } else field+=ch;
      } else if(afterQuote && ch==='"') { field+='"';quoted=true;afterQuote=false; }
      else if(ch===",") { take();afterQuote=false; }
      else if(ch==="\n" || ch==="\r") {
        take();afterQuote=false; if(ch==="\r") skipLF=true;
        // Match Python csv.DictReader's treatment of genuinely empty lines.
        if(row.length!==1 || row[0]!=="") yield row;
        row=[];
      } else if(ch==='"' && !field && !afterQuote) quoted=true;
      else {
        if(afterQuote) throw new Error("Unexpected text after a quoted CSV field.");
        field+=ch;
      }
      if(field.length>131072) throw new Error("A CSV field exceeds the safe size limit.");
    }
  }
  if(quoted) throw new Error("The CSV archive ends inside a quoted field.");
  if(field || row.length || afterQuote) { take(); yield row; }
}

export async function* gzipText(file:Blob):AsyncGenerator<string> {
  const reader=file.stream().pipeThrough(new DecompressionStream("gzip"))
    .pipeThrough(new TextDecoderStream("utf-8",{fatal:true})).getReader();
  try {
    while(true) {const result=await reader.read();if(result.done) break;yield result.value;}
  } finally { await reader.cancel().catch(()=>{});reader.releaseLock(); }
}
