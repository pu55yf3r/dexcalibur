// global
var fs = require("fs");
var Chalk = require("chalk");

var ut = require("./Utils.js");
const CLASS = require("./CoreClass.js");
var CONST = require("./CoreConst.js");
var VM = require("./VM.js");
var OPCODE = require("./Opcode.js");

// local
var Parser = require("./SmaliParser.js");
var SmaliParser = new Parser();


var DataModel = {
    class: new CLASS.Class(),
    field: new CLASS.Field(),
    method: new CLASS.Method(),
    call: new CLASS.Call(),
    modifier: new CLASS.Modifiers(),
    objectType: new CLASS.ObjectType(),
    basicType: new CLASS.BasicType()
};

var STATS = {
    idxMethod: 0,
    idxClass: 0,
    idxField: 0,
    instrCtr: 0,
    methodCalls: 0,
    fieldCalls: 0
};

// NEED : generic field signature equals
function superField2(field, cls){

    for(let i in cls.fields){
        if(cls.fields[i].name===field.name){
            if(cls.fields[i]._isBinding===true){
                cls.fields[i].declaringClass = cls.fields[i].enclosingClass;
                cls.fields[i].enclosingClass = cls;
                return cls.fields[i];
            }else if(cls.fields[i].modifiers.isNotPrivate()){ 
                cls.fields[i].declaringClass = cls.fields[i].enclosingClass;
                cls.fields[i].enclosingClass = cls;
                return cls.fields[i];
            }
        } 
             
    }

    if(cls._isBinding === true){
        return VM.getBinding(field,cls.fqcn);
    }
    else if(cls.extends instanceof CLASS.Class){
        return superField2(field, cls.extends);
    }else
        return null; 
}

function superMethod(meth, cls){
    /*if(cls === undefined){
        console.log(cls);
        return null;
    }*/
    for(let i in cls.methods){
        //console.log(Chalk.bold.red(cls.methods[i].callSignature(),meth.callSignature()));
        if(cls.methods[i].callSignature() === meth.callSignature()){
            if(cls.methods[i]._isBinding===true){
                cls.methods[i].declaringClass = cls.methods[i].enclosingClass;
                cls.methods[i].enclosingClass = cls;
                return cls.methods[i];
            }else if(cls.methods[i].modifiers.isNotPrivate()){ 
                cls.methods[i].declaringClass = cls.methods[i].enclosingClass;
                cls.methods[i].enclosingClass = cls;
                return cls.methods[i];
            }
        } 
             
    }

    //console.log("["+cls.fqcn+"] Scan super ",cls);
    // during class mapping, binding of superclass should be
    // detected
    if(cls._isBinding === true){
        //console.log("["+cls.fqcn+"] Super binding");
        return VM.getBinding(meth,cls.fqcn);
    }
    else if(cls.extends instanceof CLASS.Class){
        return superMethod(meth, cls.extends);
    }else
        return null; 
}


function superInterfaceMethod(meth, interfaces){
    
    // console.log("[SEARCH INTERFACE FOR]",meth.signature());

    let imeth = null, ret = null;

    for(let j in interfaces){
        ret = null;

        for(let i in interfaces[j].methods){
            imeth = interfaces[j].methods[i];
            

            // console.log("> INTERFACE >",imeth.callSignature(),meth.callSignature());
            if(imeth.callSignature() === meth.callSignature()){
                
                // new implementation of a function is like a derivation of the Method
                return imeth.newImplementationBy(meth.enclosingClass);
            } 
        }
    
        // during class mapping, binding of superclass should be
        // detected
        if(interfaces[j]._isBinding === true){
            ret = VM.getBinding(meth,cls.fqcn);
        }
        else if(interfaces[j].implements.length > 0){
            ret = superInterfaceMethod(meth, interfaces[j].implements);
        }
  
        if(ret != null) return ret;
    }

    return null; 
}


var Resolver = {
    type: function(db, fqcn){

        if(fqcn instanceof CLASS.Class){ 
            if(db.classes[fqcn.fqcn] !== undefined)
                return db.classes[fqcn];
        }else{
            if(db.classes[fqcn] !== undefined)
                return db.classes[fqcn];
        }
        
        //console.log("Resolver::type : ",fqcn);
        if(VM.hasBinding(fqcn)){

            //console.log("[SOLVER::TYPE] Binding >"+fqcn);
            return VM.getBindingFromFQCN(fqcn);
        }else{

            let ref = new CLASS.MissingReference(
                CONST.OPCODE_REFTYPE.TYPE, 
                SmaliParser.class(fqcn));
            
            db.classes[fqcn] = ref;
            
            //db.notloaded.push(ref);
            db.missing.push(ref);
        
            return ref;
        }
    },
    field: function(db, fieldRef){

        let field = null;
        let cls=db.classes[fieldRef.fqcn];
        let notmissing = !(cls instanceof CLASS.MissingReference);

        //console.log(fieldRef.fqcn,fieldRef.signature());

        // test if the class definition has been found,
        // or binded class has been detected
        if(notmissing && cls !== undefined){

            field = db.classes[fieldRef.fqcn].fields[fieldRef.signature()];
            
            // if field is found
            if(field instanceof CLASS.Field){
                //console.log("DB field "+n+" found");
                return field;
            }

            // else, if it is an internal class, give the field
            if(cls._isBinding==true){
                //console.log("Enter in binding");
                field=VM.getBinding(fieldRef);
                 if(field!==null){
                     if(field.enclosingClass == null) 
                        field.enclosingClass = cls;
                     //console.log("Binding found : ",cls.fqcn);
                     return field;
                 }
            }

            // else, if the class has super class, search inherit field
            if(field===null && cls.extends !== [] && !(cls instanceof CLASS.MissingReference)){ 
                //console.log("Enter in Extends");
                /*
                if(cls._isBinding==true){
                    x=VM.getBinding(fieldRef);
                    console.log(x);
                    if(x!==null) return x;
                }*/
                //console.log(cls);
                field=superField2(fieldRef, cls.extends);
                if(field!==null){
                    //console.log("Class existing, but search extends : ",fieldRef);
                    //console.log("["+cls.fqcn+"] Extended field '"+x.name+"' found");
                    return field;
                }
            }

            //console.log("Missing ? ",n);
            // else, create a MissingReference,
            // it is very common if control flow is obfuscted
            // and if custom class loaders are loaded 
            // while runtime (just in time)
        }
        else if(notmissing && VM.hasBinding(fieldRef.fqcn)){
            // if it is a field from an internal class 
            // and if the class has never been call
            //console.log("Entering in binding");
            
            field = VM.getBinding(fieldRef);
            //console.log("[BINDING] "+fieldRef.fqcn+";->"+fieldRef.name, (x instanceof CLASS.Field));
            if(field!==null){
                //console.log("VM : ",fieldRef);
                return field;
            }
        }
 
        // if class is missing, create it 
        if(!notmissing){
            //console.log("Missing class : "+fieldRef.fqcn);
            db.classes[fieldRef.fqcn] = cls = new CLASS.MissingReference(
                CONST.OPCODE_REFTYPE.CLASS, 
                new CLASS.Class({
                    name: fieldRef.fqcn,
                    simpleName: fieldRef.fqcn.substr(fieldRef.fqcn.lastIndexOf("."))
                }));
        }

        //console.log("MissingRef "+fieldRef.fqcn+"."+fieldRef.name);
        // MissingReference can be solved by HookingEngine at runtime
        let mref = new CLASS.MissingReference(
            CONST.OPCODE_REFTYPE.FIELD, 
            fieldRef.toField(),cls);

            
        //console.log("[SOLVER::FIELD] "+fieldRef.fqcn+";->"+fieldRef.name+" Missing reference");

        // all MissingReference are indexed in a dedicated array
        // the HookingEngine will try to resolve it when additonal
        // custom class loaders will be load.
        // db.notloaded.push(mref);
        db.missing.push(mref);
        
        return mref;
    },
    method: function(db, methRef){


        let cls=db.classes[methRef.fqcn];
        let meth=null, x=null;
        let notmissing = !(cls instanceof CLASS.MissingReference);


        if(notmissing && cls !== undefined){

            method = db.classes[methRef.fqcn].methods[methRef.signature()];
            
            // differencier interface/class pour <init> et <clinit>

            // id the method definition is accessible
            if(method instanceof CLASS.Method)
                return method;
            /*
            if(methRef.fqcn.indexOf("StringBuilder")>-1){
                console.log(methRef.signature());
            }*/

            // else, if the enclosing class is binded (java class, etc..)
            if(cls._isBinding==true){
                //console.log(Chalk.bold.red("is_binding : "+methRef.signature()));
                x=VM.getBinding(methRef);
                if(x!==null){ 
                    x.enclosingClass = cls;
                    return x;
                }
            }

           // else, if the class has super class, search inherit field
           if(x===null && cls.extends != null && !(cls instanceof CLASS.MissingReference)){
               x=superMethod(methRef, cls.extends);
               
               /*if(x !== undefined && x !== null && x.enclosingClass.name.indexOf("lang.Object")>-1){ 
                    console.log("Resolver::method (1) ", methRef.signature(),x);
               }*/
               
               if(x!==null){
                   //console.log("["+cls.fqcn+"] Extended field '"+x.name+"' found");
                   // x.enclosingClass = cls;
                   return x;
               }else{
                   //console.log("Resolver::method (2) ", methRef.signature());
                   /*for(let i in db.classes[methRef.fqcn].methods){
                       console.log("(2)",i);
                   }*/
               }
           }
           
            // search for interface
            if(x===null && cls.implements != null && !(cls instanceof CLASS.MissingReference)){
                x=superInterfaceMethod(methRef, cls.implements);
                                
                if(x!==null){
                    //console.log("["+cls.fqcn+"] Extended field '"+x.name+"' found");
                    // x.enclosingClass = cls;
                    return x;
                }else{
                    //console.log("Resolver::method (2) ", methRef.signature());
                    /*for(let i in db.classes[methRef.fqcn].methods){
                        console.log("(2)",i);
                    }*/
                }
            }
            missing = true;
        }
        else if(VM.hasBinding(methRef.fqcn)){
            // if it is a field from an internal class 
            // and if the class has never been call
            let x=null;
            //if(methRef.name.indexOf("Library")>-1) console.log(methRef);
            x = VM.getBinding(methRef);

            //if(methRef.name.indexOf("Library")>-1)
            //    console.log("[BINDING] "+methRef.fqcn+";->"+methRef.name, x.name);
    
            if(x!==null){
                //console.log("Bind : ",x);
                return x;
            }
        }
 
        //if(cls === null) console.log("Class not found : ",methRef.fqcn)
        
        if(!notmissing){

            console.log("Missing class : "+methRef.fqcn);
            db.classes[methRef.fqcn] = cls = new CLASS.MissingReference(
                CONST.OPCODE_REFTYPE.CLASS, 
                new CLASS.Class({
                    name: methRef.fqcn,
                    simpleName: methRef.fqcn.substr(methRef.fqcn.lastIndexOf("."))
                }));
        }
        
        //if(methRef.fqcn.indexOf("StringBuilder")>-1) 
        //    console.log("[UNLOADED]",methRef.fqcn)            
        

        // MissingReference can be solved by HookingEngine at runtime
        let mref = new CLASS.MissingReference(
            CONST.OPCODE_REFTYPE.METHOD, 
            methRef.toMethod(),cls);

        //cls.field

        //console.log("[SOLVER::FIELD] "+fieldRef.fqcn+";->"+fieldRef.name+" Missing reference");

        // all MissingReference are indexed in a dedicated array
        // the HookingEngine will try to resolve it when additonal
        // custom class loaders will be load.
        // db.notloaded.push(mref);
        db.missing.push(mref);

        return mref;
    }
};


/**
 * To analyze each instruction and resolve symbols
 * 
 * @param {Method} method The method to analyse 
 * @param {Object} data The database to use when resolving 
 * @param {Object} stats The statistics counters
 * @function 
 */
function mapInstructionFrom(method, data, stats){
    let bb = null, instruct = null, obj = null, x = null, success=false, cls=[];

    if(! method instanceof CLASS.Method){
        console.error("[!] mapping failed : method provided is not an instance of Method.");
    }

    for(let i in method.instr){

        bb = method.instr[i];
        bb._parent = method;
        // get basic blocks
        
        for(let j in bb.stack){
            instruct = bb.stack[j];
            instruct.line = bb.line;    
            instruct._parent = bb;       

            success = false;
            stats.instrCtr++;
            if(instruct.isDoingCall()){

                if(instruct.right.special){
                    // ignore
                    continue;
                }
                // obj = Resolver.method(data, instruct.right);


                instruct.right = Resolver.method(data, instruct.right);
                instruct.right._callers.push(method); 
                
                data.call.push(new CLASS.Call({ 
                    caller: method, 
                    calleed: instruct.right, //obj, 
                    instr: instruct}));
                
                stats.methodCalls++;


                if(method._useClass[instruct.right.fqcn] == undefined)
                    method._useClass[instruct.right.fqcn] = [];
                if(method._useMethod[instruct.right.signature()] == undefined)
                    method._useMethod[instruct.right.signature()] = [];


                method._useClass[instruct.right.fqcn].push(instruct.right.enclosingClass);
                method._useMethod[instruct.right.signature()].push(instruct.right);

                success = true;
            }
            else if(instruct.isCallingField()){

                if(instruct.right == null){
                    console.log("Right null");
                }

                // Never returns NULL
                // if field not exists, return MissingReference object
                instruct.right = Resolver.field(data, instruct.right);

                //instruct.right = obj;
                if(instruct.right === undefined || instruct.right._callers === undefined){
                    console.log("Instruct::right undef (analyzer)", instruct);
                }
                instruct.right._callers.push(method); 
                
                data.call.push(new CLASS.Call({ 
                    caller: method, 
                    calleed: instruct.right, 
                    instr: instruct}));

                stats.fieldCalls++;
                
                if(method._useClass[instruct.right.fqcn] == undefined)
                    method._useClass[instruct.right.fqcn] = [];
                if(method._useField[instruct.right.signature()] == undefined)
                    method._useField[instruct.right.signature()] = [];
                
                
                method._useClass[instruct.right.fqcn].push(instruct.right.enclosingClass);
                method._useField[instruct.right.signature()].push(instruct.right);

                success = true;
            }
            else if(instruct.isUsingString()){

                // add USAGE: NEW/READ/WRITE

                data.strings.push(new CLASS.StringValue({ 
                    src: method, 
                    instr: instruct, 
                    value: instruct.right._value }));
                success=true;
            }
            // Resolve Type reference
            else if(instruct.isReferencingType()){

                // Never returns NULL
                // if type not exists, return MissingReference object
                if(instruct.right instanceof CLASS.ObjectType){

                    obj = Resolver.type(data, instruct.right.name);
                    
                    obj._callers.push(method); 

                    data.call.push(new CLASS.Call({ 
                        caller:method, 
                        calleed:obj, 
                        instr:instruct}));

                    if(method._useClass[obj.name] == undefined)
                        method._useClass[obj.name] = [];

                    //method._useClass[obj._hashcode] = obj;
                    method._useClass[obj.name].push(instruct);
                }
                success = true;
            }

            if(!success){
                data.parseErrors.push(instruct);
            }
                
        }
    }
}


/*
 make map by linking object :
 -> resolve FQCN
 -> resolve method called
 and create additional index in the DB
 */
function MakeMap(data,absoluteDB){
    
    console.log("\n[*] Start object mapping ...\n------------------------------------------");
    let step = data.classesCtr, g=0;

    /*
    let c = 0;
    for(let i in data.classes)c++;
    console.log(Chalk.bold.red("Classes in DB : "+c));
    */
    // merge Absolute DB and Temp DB
    for(let i in data.classes){
        if(absoluteDB.classes[i] == undefined){
            absoluteDB.classes[i] = data.classes[i];
        }
    }

    // link class with its fields and methods
    for(let i in data.classes){
        cls = absoluteDB.classes[i];
        
        // map super class
        if(cls.extends != null){
            cls.extends = Resolver.type(absoluteDB, cls.extends);
            
            //cls.extends = Resolver.type(data, cls.extends);
            //cls.extends = Resolver.type(data, cls.extends.fqcn);
        }

        // map interfaces
        for(let j in cls.implements){
            
            //cls.implements[j] = Resolver.type(data, cls.implements[j]); 
            //cls.implements[j] = Resolver.type(data, cls.implements[j]);  
            cls.implements[j] = Resolver.type(absoluteDB, cls.implements[j]); 
        }

        // TODO : map annotations

        // map fields
        for(let j in cls.fields){
            o=cls.fields[j];
        
            // broadcast FQCN from Class objects to Field objects 
            o.fqcn = cls.fqcn;
            o.enclosingClass = cls;

            // data.fields[o.hashCode()] = o;
            absoluteDB.fields[o.hashCode()] = o;
            
            STATS.idxField++;
        }

        // map methods
        for(let j in cls.methods){
            o=cls.methods[j];
            
            o.enclosingClass = cls;
            //data.methods[o.signature()] = o;
            absoluteDB.methods[o.signature()] = o;
            
            STATS.idxMethod++;
        }

    }
    
    // collect packages
    /*for(let i in data.classes){
        if(data.packages[data.classes[i].package] == undefined){
            data.packages[data.classes[i].package] = new CLASS.Package(
                data.classes[i].package
            );
        }
        data.packages[data.classes[i].package].childAppend(data.classes[i]);
        data.classes[i].package = data.packages[data.classes[i].package];
    }*/

    for(let i in data.classes){
        if(absoluteDB.packages[data.classes[i].package] == undefined){
            absoluteDB.packages[data.classes[i].package] = new CLASS.Package(
                absoluteDB.classes[i].package
            );
        }
        absoluteDB.packages[data.classes[i].package].childAppend(absoluteDB.classes[i]);
        absoluteDB.classes[i].package = absoluteDB.packages[data.classes[i].package];
    }

    let c = 0;
    for(let j in absoluteDB.classes) c++;
    console.log(Chalk.bold.red("DB size : "+c));

    let off=0; mr=0;
    for(let i in data.classes){
        /*
        if(absoluteDB.classes[i] instanceof CLASS.Class){
            for(let j in absoluteDB.classes[i].methods){
                if(absoluteDB.classes[i].methods[j] instanceof CLASS.Method){
                    //mapInstructionFrom(data.classes[i].methods[j], data, STATS);
                    mapInstructionFrom(absoluteDB.classes[i].methods[j], absoluteDB, STATS);
                }
            }
            off++;
            if(off%200==0 || off==step)
                console.log(off+"/"+step+" Classes mapped ("+i+")") ;
        }*/
        
        if(data.classes[i] instanceof CLASS.Class){
            for(let j in data.classes[i].methods){
                if(data.classes[i].methods[j] instanceof CLASS.Method){
                    //mapInstructionFrom(data.classes[i].methods[j], data, STATS);
                    mapInstructionFrom(data.classes[i].methods[j], absoluteDB, STATS);
                }
            }
            off++;
            if(off%200==0 || off==step)
                console.log(off+"/"+step+" Classes mapped ("+i+")") ;
        }
        else{   
            mr++;
            if(mr%20==0) console.log(mr+" missing classes");
        }
    }



    console.log("[*] "+STATS.idxMethod+" methods indexed");
    console.log("[*] "+STATS.idxField+" fields indexed");
    console.log("[*] "+STATS.instrCtr+" instructions indexed");
    //console.log("[*] "+absoluteDB.strings.length+" strings indexed");
    console.log("[*] "+STATS.methodCalls+" method calls mapped");
    console.log("[*] "+STATS.fieldCalls+" field calls mapped");
    // update place where field are called
    //return data;
}

/**
 * Represents the Application map and the entrypoint for all analysis tasks
 * @param {string} encoding The file encoding to use when the bytecode is read (default: raw)  
 * @param {Finder} finder The instance of the main to update when the Applciation map is updated.
 * @constructor
 */
function Analyzer(encoding, finder){
    var db = this.db = {
        classesCtr: 0,
        classes: {},
        fieldsCtr: 0,
        fields: {},
        methodsCtr: 0,
        methods: {},
        call: [],
        unmapped: [],
        notbinded: [],
        notloaded: [],
        strings: [],
        packages: [],
        syscalls: [],
        missing: [],
        parseErrors: [],
        files: [],
        buffers: []
    };

    let tempDb = this.tempDb = {
        classesCtr: 0,
        classes: {},
        fieldsCtr: 0,
        fields: {},
        methodsCtr: 0,
        methods: {},
        call: [],
        unmapped: [],
        notbinded: [],
        notloaded: [],
        missing: [],
        parseErrors: [],
        strings: [],
        packages: [],
        files: [],
        buffers: []
    }

    this.finder = finder;

    var config = {
        wsPath: null,
        encoding: encoding
    };

    this.newTempDb = function(){
        return {
            classesCtr: 0,
            classes: {},
            
            fieldsCtr: 0,
            fields: {},
            
            methodsCtr: 0,
            methods: {},

            call: [],
            unmapped: [],

            notbinded: [],
            notloaded: [],
            
            strings: [],
            packages: [],
            
            missing: [],
            parseErrors: [],
            files: [],
            buffers: []
        };
    }

    this.file = function(filePath){
        if(!filePath.endsWith(".smali"))
            return;

        // TODO : test UTF8 support
        let src=fs.readFileSync(filePath,config.encoding);
        
        // parse file
        let cls= SmaliParser.parse(src), o=null;
        
        tempDb.classes[cls.fqcn] = cls;
        tempDb.classesCtr += 1;
        /* 
        db.classes[cls.fqcn] = cls;
        db.classesCtr+=1; */
    };

    this.debug = {
        notbinded: ()=>{ return new FinderResult(db.notbinded) },
        unmapped: ()=>{ return new FinderResult(db.unmapped) }
    };


    this.path = function(path){
        tempDb = this.newTempDb();

        // TODO : hcek if path exists;
        ut.forEachFileOf(path,this.file,".smali");

        STATS.idxClass = this.db.classesCtr;
        
        console.log("[*] Smali analyzing done.\n---------------------------------------")
        console.log("[*] "+tempDb.classesCtr+" classes analyzed. ");
        
        // start object mapping
        // MakeMap(this.db);
        MakeMap(tempDb, this.db);

        this.finder.updateDB(this.db);
    };

    /**
     * To get the internal database
     */
    this.getData = function(){
        return this._db;
    }
}

/**
 * To initialize the list of syscalls to use
 * @param {*} syscalls 
 */
Analyzer.prototype.useSyscalls = function(syscalls){
    this.db.syscalls = {};
    for(let i=0; i<syscalls.length ; i++){
        for(let j=0; j<syscalls[i].sysnum.length; j++){
            if(syscalls[i].sysnum[j]>-1){
                this.db.syscalls[syscalls[i].sysnum[j]] =
                    syscalls[i];
            }
        }
    }
};

/**
 * To analyze the decompiled class of Android.jar
 * @param {String} path Path of the folder containing .smali files
 */
Analyzer.prototype.system = function(path){
    // TODO : hcek if path exists;
    ut.forEachFileOf(path,this.file,".smali");

    STATS.idxClass = this.db.classesCtr;
    
    console.log("[*] Smali analyzing done.\n---------------------------------------")
    console.log("[*] "+STATS.idxClass+" classes analyzed. ");
    
    // start object mapping
    MakeMap(this.db);

    this.finder.updateDB(this.db);

}

Analyzer.prototype.flattening = function(method){
    let instr = [], meta={};
    for(let i in method.instr){
        meta = {
            label: (method.instr[i].tag !== null)? method.instr[i].tag : null,
            line: method.instr[i].line
        }
        for(let j in method.instr[i].stack){
            instr.push(method.instr[i].stack[j]);
            if(j==0){
                instr[instr.length-1].meta = meta;
            }
        }
    }

    return instr;
}

Analyzer.prototype.findBasicBlocks = function(instr){
    let bblocks = [], blk={};

    blk = {stack:[], next:[], label:null };
    for(let i in instr){
        if(instr[i].meta !== undefined && (instr[i].meta.label !== null)){
            if(blk.stack.length > 0 && i>0){
                blk.parent = bblocks[bblocks.length-1];        
                bblocks.push(blk);    
            } 

            blk = {stack:[], next:[], label:instr[i].meta.label }; 
            blk.stack.push(instr[i]);
        }
        else if(instr[i].opcode.type==CONST.INSTR_TYPE.IF){
            blk.stack.push(instr[i]);
            blk.parent = bblocks[bblocks.length-1];
            
            bblocks.push(blk);
            blk = {stack:[], next:[], label:null }; 
        }
        /*else if(instr[i].opcode.type==CONST.INSTR_TYPE.SWITCH){

            bblocks.push(blk);
            blk = {stack:[], next:[]};
        }*/
        else if(instr[i].opcode.type==CONST.INSTR_TYPE.GOTO){
            //blk.node.pu
            bblocks.push(blk);
            blk = {stack:[], next:[], label:null };
        }
        /*
        else if(instr[i].opcode.flag & CONST.OPCODE_TYPE.SETS_REGISTER){
            bblocks.push(blk);
            blk = {stack:[]};
        }*/
        else{
            blk.stack.push(instr[i]);
        }
    }

    return bblocks;
}

Analyzer.prototype.findBBbyLabel = function(bblocks,label){
    for(let i=0; i<bblocks.length; i++){
        bblocks[i].offset = i;
        if(bblocks[i].label !== null && bblocks[i].label==label){
            return bblocks[i];
        }
    }
    return null;
};

Analyzer.prototype.makeTree = function(bblocks){
    let last = {};
    for(let i=0; i<bblocks.length; i++){
        bblocks[i].offset = i;
        if(bblocks[i].stack.length > 0){
            last = bblocks[i].stack[bblocks[i].stack.length-1];

            switch(last.opcode.type){
                case CONST.INSTR_TYPE.IF:
                    bblocks[i].next.push({
                        jump: CONST.BRANCH.IF_TRUE,
                        block: this.findBBbyLabel(bblocks,last.right.name) 
                    });
                    bblocks[i].next.push({
                        jump: CONST.BRANCH.IF_FALSE,
                        block: bblocks[i+1] 
                    });
                    break;
                case CONST.INSTR_TYPE.GOTO:
                    bblocks[i].next.push({
                        jump: CONST.BRANCH.INCONDITIONNAL_GOTO,
                        block: this.findBBbyLabel(bblocks,last.right.name)
                    });
                    break;
                default:
                    if(bblocks[i+1] != null && bblocks[i+1].label != null){
                        bblocks[i].next.push({
                            jump: CONST.BRANCH.INCONDITIONNAL,
                            block: bblocks[i+1]
                        });
                    }
                    break;
            }
        }
    }

    return bblocks;
}

Analyzer.prototype.showBlock = function(blk,prefix,styleFn){
    
    if(blk==null) return;

    for(let i in blk.stack){
        console.log(prefix+styleFn("| "+blk.stack[i]._raw));
        //if()
    }
    //console.log(styleFn("-------------------------------------"));
};

Analyzer.prototype.showCFG_old = function(bblocks, prefix=""){

    let pathTRUE = Chalk.green(prefix+"    |\n"+prefix+"    |\n"+prefix+"    |\n"+prefix+"    +-----[TRUE]-->");
    let path_len = "    +-----[TRUE]-->".length;
    let pathFALSE = Chalk.red(prefix+"    |\n"+prefix+"    |\n"+prefix+"    |\n"+prefix+"    +-----[FALSE]->");
    let pathNEXT = Chalk.yellow(prefix+"    |\n"+prefix+"    |\n"+prefix+"    |\n"+prefix+"    V");
    let mockFn = x=>x;

    for(let i=0; i<bblocks.length; i++){

        this.showBlock(bblocks[i], prefix, mockFn);

        if(bblocks[i].next.length > 1){
            prefix += " ".repeat(path_len);

            for(let j in bblocks[i].next){
                switch(bblocks[i].next[j].jump){
                    case CONST.BRANCH.IF_TRUE:
                        console.log(prefix+Chalk.bold.green("if TRUE :"));
                        this.showBlock(bblocks[i].next[j].block, prefix, Chalk.green); 
                        break;
                    case CONST.BRANCH.IF_FALSE:
                        console.log(prefix+Chalk.bold.red("if FALSE :"));
                        this.showBlock(bblocks[i].next[j].block, prefix, Chalk.red);
                        break;
                }
            }
        }
        else if(bblocks[i].next.length == 1){
            console.log(pathNEXT);
            this.showBlock(bblocks[i].next[j].block, prefix, Chalk.white);
        }
    }
}

Analyzer.prototype.showCFG = function(bblocks, offset=0, prefix="", fn=null){

    if(bblocks.length==0 || bblocks[offset]==undefined){
        console.log(offset+" => not block");
        return null;
    } 

    let pathTRUE = Chalk.green(prefix+"    |\n"+prefix+"    |\n"+prefix+"    |\n"+prefix+"    +-----[TRUE]-->");
    let path_len = 6;"    +-----[TRUE]-->".length;
    let pathFALSE = Chalk.red(prefix+"    |\n"+prefix+"    |\n"+prefix+"    |\n"+prefix+"    +-----[FALSE]->");
    let pathNEXT = Chalk.yellow(prefix+"    |\n"+prefix+"    |\n"+prefix+"    |\n"+prefix+"    V");
    let mockFn = x=>x;

    
    this.showBlock(bblocks[offset], prefix, (fn==null)? mockFn : fn);


    if(bblocks[offset].next.length > 1){
        prefix += " ".repeat(path_len);

        for(let j in bblocks[offset].next){
            switch(bblocks[offset].next[j].jump){
                case CONST.BRANCH.IF_TRUE:
                    console.log(prefix+Chalk.bold.green("if TRUE :"));
                    //this.showBlock(bblocks[offset].next[j], prefix, Chalk.green); 
                    if(bblocks[offset].next[j].block == null){
                        
                    }else{
                        this.showCFG(bblocks, bblocks[offset].next[j].block.offset+1, prefix, Chalk.green);
                    }
                        // this.showCFG(bblocks, bblocks[offset].next[j].offset+1, prefix);
                    break;
                case CONST.BRANCH.IF_FALSE:
                    console.log(prefix+Chalk.bold.red("if FALSE :"));
                    //this.showBlock(bblocks[offset].next[j], prefix, Chalk.red);
                    this.showCFG(bblocks, offset+1, prefix, Chalk.red);
                    break;
            }
        }
    }
    else if(bblocks[offset].next.length == 1){
        this.showCFG(bblocks, offset+1, prefix, Chalk.yellow);
        //console.log(pathNEXT);
        //this.showBlock(bblocks[i].next[j].block, prefix, Chalk.white);
    }
    
}

Analyzer.prototype.cfg = function(method){
    let instr = [], meta={}, bblocks = [], blk={};

    // list instr
    instr = this.flattening(method);
    
    
    // find basic block
    bblocks = this.findBasicBlocks(instr);
    
    // get tree
    bblocks = this.makeTree(bblocks);
    

    // show
    this.showCFG(bblocks,0);

    return bblocks;
}

/**
 * 
 * @param {Class} cls New class to insert into the model 
 */
Analyzer.prototype.updateWithClass = function(cls){
    
};


Analyzer.prototype._updateWithEachFileOf = function(filesDB, updater){
    //this.db.files 
    for(let i=0; i<this.db.files.length; i++){
        for(let j=0; j<filesDB.length; j++){
            updater( this.db, filesDB[j],this.db.files[i]);
        }
    }
};

Analyzer.prototype.updateFiles = function(filesDB, override){
    this._updateWithEachFileOf(
        filesDB,
        // check if the file can be treated
        function(db, inFile, dbFile){
            if((inFile.path == dbFile.path)||override){
                //dbFile.update(inFile);
            }else{
                db.files.push(inFile);
            }
        }
    )
};

Analyzer.prototype.insertIn = function(category, inData){
    for(let i=0; i<inData.length; i++){
        this.db[category].push(inData[i]);
    }
};

/*
Analyzer.prototype._updateWithBuffers = function(filesDB, condition, updater){
    //this.db.files 
    for(let i=0; i<this.db.files.length; i++){
        for(let j=0; j<filesDB.length; j++){
            if(condition( filesDB[j], this.db.files[i])){
                updater( this.db, filesDB[j],this.db.files[i]);
            }
        }
    }
};*/


module.exports = Analyzer;