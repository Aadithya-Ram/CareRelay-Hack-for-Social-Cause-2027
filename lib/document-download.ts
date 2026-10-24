// Keep the uploaded basename, never a client-provided directory or header control.
export function documentFilename(name:string,mime:string){
  const basename=name.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f\u007f]/g,'').trim()||'document';
  const extension:Record<string,string>={'application/pdf':'.pdf','image/png':'.png','image/jpeg':'.jpg'};
  return /\.[a-z0-9]{1,10}$/i.test(basename)?basename:basename+(extension[mime]??'');
}

export function documentDisposition(name:string,mime:string){
  const filename=documentFilename(name,mime);
  const fallback=filename.replace(/[^\x20-\x7e]|["\\]/g,'_');
  const encoded=encodeURIComponent(filename).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
