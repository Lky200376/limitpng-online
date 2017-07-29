var path=require("path");
var os=require("os");
var fs=require("fs");
var fsex=require("fs-extra");
var child_process=require("child_process");
var exec = child_process.exec; 
function LimitPNG(in_pngFile,log)
{
	wlog=log;
    this.pngFile = "";
	this.mode="";
    if (in_pngFile != undefined)
    {
        if (fileExists(in_pngFile))
        {
            this.pngFile = path.resolve(in_pngFile);
            this.tempFile = this.allocTemp();
            // this.color = this.getPngColorInfo();
        }
        else
        {
            console.error("file not exist:" + in_pngFile)
        }


    }

    return this;
}


LimitPNG.prototype.doDefault = function (option, mode, callBack)
{
	this.mode=mode;
    //this.do([PROCE.truePNG(1),  PROCE.pngout(2), PROCE.cryopng(1), PROCE.pngwolf(1),PROCE.zopflipng(1)])  // 移除PROCE.cryopng(1)
    if (mode == "limit")
    {
        this.do([PROCE.truePNG(1), PROCE.pngout(2), PROCE.pngwolf(1), PROCE.zopflipng(1)], option, callBack)
    }
    else if (mode == "high")
    {
        this.do([PROCE.pngwolf(1), PROCE.ect(0)], option, callBack)
    }
    else if (mode == "quick")
    {
        this.do([PROCE.ect(0)], option, callBack)
    }
    else if (mode == "256-high")
    {
        this.do([PROCE.pngquant(22, true), PROCE.truePNG(1), PROCE.pngout(2), PROCE.pngwolf(1), PROCE.zopflipng(1)], option, callBack)
    }
    else if (mode == "256-low")
    {
        this.do([PROCE.pngquant(24, true), PROCE.truePNG(1), PROCE.pngout(2), PROCE.pngwolf(1), PROCE.zopflipng(1)], option, callBack)
    }
    else if (mode == "256-lowest")
    {
        this.do([PROCE.pngquant(25, true), PROCE.truePNG(1), PROCE.pngout(0, true), PROCE.pngwolf(1), PROCE.zopflipng(1)], option, callBack)
    }
    else if (mode == "lossy-high")
    {
        this.do([PROCE.pngquant(26, true), PROCE.truePNG(1), PROCE.pngout(0, true), PROCE.pngwolf(1), PROCE.zopflipng(1)], option, callBack)
    }
    else if (mode == "lossy-low")
    {
        this.do([PROCE.pngquant(27, true), PROCE.truePNG(1), PROCE.pngout(0, true), PROCE.pngwolf(1), PROCE.zopflipng(1)], option, callBack)
    }
    else if (mode == "lossy-quick")
    {
        this.do([PROCE.pngquant(26, true), PROCE.ect(0)], option, callBack)
    }
    else if (mode == "pq-tset")
    {
        this.do([PROCE.pngquant(26, true)], option, callBack)
    }
}

LimitPNG.prototype.doDefaultLossy = function ()
{
    this.do([PROCE.pngquant(3, true), PROCE.truePNG(1), PROCE.pngout(2), PROCE.pngwolf(1), PROCE.zopflipng(1)])
}


LimitPNG.prototype.do = function (in_processors, outOption, callBack)
{
    var sizeLog = "";
    if (in_processors == undefined)
    {
        return null;
    }
    try
    {
        //fs.createReadStream(this.pngFile).pipe(fs.createWriteStream(this.tempFile));
        fsex.copySync(this.pngFile, this.tempFile);
    } catch (e)
    {
        console.error(e)
        return null;
    }


    //fsex.copySync(this.pngFile, this.tempFile);
    //fs.re.exeName(this.tempFile, this.tempFile+"2222222");


    function _doChild(_proce, _tempFile, _i, resolve, reject)
    {
        try
        {
			var exepfx="";
			if(os.platform()=="win32")exepfx=".exe";
            let do_cmd = '"' + path.resolve(__dirname +"/bin/"+ _proce.exeName+exepfx) + '" ' + _proce.cmd(_tempFile);
            wlog.info("cmd ",_i,do_cmd);
            let child = child_process.exec(do_cmd, {timeout: 3654321}, function (error, stdout, stderr)
            {
                if (error != undefined)
                {
                    console.error("serror:" + _i + "\n" + error);
                }
                sizeLog = sizeLog + "->[" + _proce.exeName + " : " + getFileSize(_tempFile) + "]"
                wlog.info("sizeLog",_i,sizeLog);
                resolve(_i);
            });


            child.stdout.on('data', (data) =>
            {
                wlog.info('stdout',data);
            });


        }
        catch (e)
        {

            wlog.error("CATCH",e)
            sizeLog = sizeLog + "->[" + _proce.exeName + " : " + getFileSize(_tempFile) + "]"
            wlog.info("size",_i,sizeLog);
            if (fileExists(_tempFile) != true)
            {
                reject(_i);
            }
        }
    }


    var _tempFile = this.tempFile;
    var _pngFile = this.pngFile;
	var _mode=this.mode;
	console.log(this);
    var old_size = getFileSize(_tempFile);
    var time_start = Date.now();
    var promises = [];
    var funcs = [];
    for (let i = 0; i < in_processors.length; i++)
    {
        let _tempFile = this.tempFile;

        if (i == 0)
        {
            promises[i] = new Promise(function (resolve, reject)
            {
                _doChild(in_processors[i], _tempFile, i, resolve, reject);
            });

        } else
        {
            promises[i] = new Promise(function (resolve, reject)
            {
                promises[i - 1].then(
                    function (value)
                    {
                        _doChild(in_processors[i], _tempFile, i, resolve, reject);
                    }
                )
            })

        }

    }


    promises[promises.length - 1].then(
        function (value)
        {
            var new_size = getFileSize(_tempFile);
            var time_consum = Date.now() - time_start;
            var err = "";


            if (new_size > old_size)
            {
                new_size = old_size;
                _tempFile =_pngFile;
            }

            
            if (outOption == "-overwrite")
            {
                try
                {
                    fs.createReadStream(_tempFile).pipe(fs.createWriteStream(_pngFile));
                } catch (e)
                {
                    console.error(e)
                    err = "无法写入到原文件。" + e
                    callBack(_pngFile, old_size, new_size, time_consum, err);
                    return null;
                }
            }
            else if (outOption == "-suffix")
            {
                var new_path = path.join(path.dirname(_pngFile), path.parse(_pngFile).name + "_"+_mode.replace("-","_")+".png")
                try
                {
                    fs.createReadStream(_tempFile).pipe(fs.createWriteStream(new_path));
                } catch (e)
                {
                    console.error(e)
                    err = "无法写入到文件 -suffix。" + e
                    callBack(new_path, old_size, new_size, time_consum, err);
                    return null;
                }
            }
            else if (fileExists(outOption))
            {
                var new_path = path.join(outOption, path.parse(_pngFile).base)

                try
                {
                    fs.createReadStream(_tempFile).pipe(fs.createWriteStream(new_path));
                } catch (e)
                {
                    console.error(e)
                    err = "无法写入到文件 -out。" + e
                    callBack(new_path, old_size, new_size, time_consum, err);
                    return null;
                }
            }


            wlog.info("sizeLog","Done",sizeLog);


            callBack(new_path, old_size, new_size, time_consum, err, sizeLog);
            return 0;
        }
    )

}


LimitPNG.prototype.allocTemp = function ()
{
    let temp = os.tmpdir(); //"C:\Users\nullice\AppData\Local\Temp"
    temp = path.join(temp, "limitPNG_temp");


    if (fileExists(temp) == false)
    {
        fs.mkdirSync(temp)
    }
    if (fileExists(temp) == false)
    {
        console.error("无法创建临时文件夹 ：" + temp);
        return null
    }


    temp = path.join(temp, Date.now() + "_" + path.basename(this.pngFile));
    return temp;
}


// 定义 PNG 处理器：


var PROCE = {};
PROCE = PROCE;


//--- truePNG -------------------------------------
PROCE.truePNG = function (opIndex, isLossy)
{
    var re = {};
    if (isLossy)
    {
        re.op = PROCE.truePNG.lossyOps[opIndex].op;
    }
    else
    {
        re.op = PROCE.truePNG.lossLessOps[opIndex].op;
    }


    re.cmd = function (in_path)
    {
        // console.log(this)
        return ' "' + in_path + '" ' + re.op;
    };

    re.exeName = "TruePNG";
    return re;
}

PROCE.truePNG.lossLessOps = [
    {op: "-f0,5 -i0 -g0 -md remove all -zc8 -zm8 -zw7 -zs0,1 -quiet -force -y", name: "指定最佳"},
    {op: "-o max -quiet", name: "自动最佳"}
];

PROCE.truePNG.lossyOps = [
    {op: "-f0,5 -i0 -g0 -md remove all -zc8 -zm8 -zw7 -zs0,1 -quiet -force -y", name: ""},
];


//--- pngout -------------------------------------
PROCE.pngout = function (opIndex, isLossy)
{
    var re = {};
    if (isLossy)
    {
        re.op = PROCE.pngout.lossyOps[opIndex].op;
    }
    else
    {
        re.op = PROCE.pngout.lossLessOps[opIndex].op;
    }


    re.cmd = function (in_path)
    {
        // console.log(this)
        return ' "' + in_path + '" ' + re.op;
    };

    re.exeName = "pngout";
    return re;
}

PROCE.pngout.lossLessOps = [
    {op: "-f5 -s0 -k0 -q -y -force", name: "RGBA 最佳"},
    {op: "-f0 -s0 -k0 -q -y -force", name: "pal 最佳"},
    {op: "", name: "自动最佳"}
];

PROCE.pngout.lossyOps = [{op: "-c3 -quiet", name: "减色"}];

//--- pngwolf -------------------------------------
PROCE.pngwolf = function (opIndex, isLossy)
{
    var re = {};
    if (isLossy)
    {
        re.op = PROCE.pngwolf.lossyOps[opIndex].op;
    }
    else
    {
        re.op = PROCE.pngwolf.lossLessOps[opIndex].op;
    }

    re.cmd = function (in_path)
    {
        // console.log(this)
        return '--in="' + in_path + '" ' + '--out="' + in_path + '" ' + re.op;


    };

    re.exeName = "pngwolf";
    return re;
}

PROCE.pngwolf.lossLessOps = [
    {
        op: "--zlib-level=8 --zlib-strategy=1 --exclude-original --exclude-singles --exclude-heuristic --max-evaluations=1",
        name: "RGB 最佳"
    },
    {op: "", name: "自动最佳"},
];

PROCE.pngwolf.lossyOps = [];

//--- zopflipng -------------------------------------
PROCE.zopflipng = function (opIndex, isLossy)
{
    var re = {};
    if (isLossy)
    {
        re.op = PROCE.zopflipng.lossyOps[opIndex].op;
    }
    else
    {
        re.op = PROCE.zopflipng.lossLessOps[opIndex].op;
    }

    re.cmd = function (in_path)
    {
        // console.log(this)
        return re.op + ' "' + in_path + '" ' + ' "' + in_path + '" ';
    };

    re.exeName = "zopflipng";
    return re;
}

PROCE.zopflipng.lossLessOps = [
    {op: "-y --iterations=35 --filters=01234mepb", name: "多次重最佳"},
    {op: "-m -y", name: "自动最佳"},
];

PROCE.zopflipng.lossyOps = [];


//--- pngquant -------------------------------------
PROCE.pngquant = function (opIndex, isLossy)
{
    var re = {};
    if (isLossy)
    {
        re.op = PROCE.pngquant.lossyOps[opIndex].op;
    }
    else
    {
        re.op = PROCE.pngquant.lossLessOps[opIndex].op;
    }

    re.cmd = function (in_path)
    {
        // console.log(this)
        return '-o "' + in_path + '" ' + re.op + ' "' + in_path + '"';
    };

    re.exeName = "pngquant";
    return re;
}

PROCE.pngquant.lossLessOps = [];

PROCE.pngquant.lossyOps = [
    {op: " --force --speed 1 --quality 0-1 ", name: "Q0"},                // 0
    {op: " --force --speed 1 --quality 0-10 ", name: "Q10"},              // 1
    {op: " --force --speed 1 --quality 20-30 ", name: "Q30"},             // 2
    {op: " --force --speed 1 --quality 10-20 ", name: "Q20"},             // 3
    {op: " --force --speed 1 --quality 30-40 ", name: "Q40"},             // 4
    {op: " --force --speed 1 --quality 40-50 ", name: "Q50"},             // 5
    {op: " --force --speed 1 --quality 50-60 ", name: "Q60"},             // 6
    {op: " --force --speed 1 --quality 60-70 ", name: "Q70"},             // 7
    {op: " --force --speed 1 --quality 70-80 ", name: "Q80"},             // 8
    {op: " --force --speed 1 --quality 80-90 ", name: "Q90"},             // 9
    {op: " --force --speed 1 --quality 90-100 ", name: "Q100"},           // 10
    {op: " --force --speed 1 --quality 0-1 256", name: "256-Q0"},         // 11
    {op: " --force --speed 1 --quality 0-10 256", name: "256-Q10"},       // 12
    {op: " --force --speed 1 --quality 20-30 256", name: "256-Q30"},      // 13
    {op: " --force --speed 1 --quality 10-20 256", name: "256-Q20"},      // 14
    {op: " --force --speed 1 --quality 30-40 256", name: "256-Q40"},      // 15
    {op: " --force --speed 1 --quality 40-50 256", name: "256-Q50"},      // 16
    {op: " --force --speed 1 --quality 50-60 256", name: "256-Q60"},      // 17
    {op: " --force --speed 1 --quality 60-70 256", name: "256-Q70"},      // 18
    {op: " --force --speed 1 --quality 70-80 256", name: "256-Q80"},      // 19
    {op: " --force --speed 1 --quality 80-90 256", name: "256-Q90"},      // 20
    {op: " --force --speed 1 --quality 90-100 256", name: "256-Q100"},    // 21
    {op: " --force --speed 1  256", name: "256-high"},                    // 22
    {op: " --force --speed 1 --quality 40-80 256", name: "256-middle"},   // 23
    {op: " --force --speed 1 --quality 0-40 256", name: "256-low"},       // 24
    {op: " --force --speed 1 --quality 0-1 --posterize 4 256", name: "256-lowest"},      // 25
    {op: " --force --speed 1  ", name: "lossy-high"},                                    // 26
    {op: " --force --speed 1 --quality 0-40", name: "lossy-low"},                        // 27


];


//--- ect -------------------------------------
PROCE.ect = function (opIndex, isLossy)
{
    var re = {};
    if (isLossy)
    {
        re.op = PROCE.ect.lossyOps[opIndex].op;
    }
    else
    {
        re.op = PROCE.ect.lossLessOps[opIndex].op;
    }

    re.cmd = function (in_path)
    {
        // console.log(this)
        return re.op + ' "' + in_path + '" '
    };

    re.exeName = "ect";
    return re;
}

PROCE.ect.lossLessOps = [
    {op: "-s3", name: "最好"},
    {op: "-s2", name: "平衡"},
    {op: "-s1", name: "快速"},
];

PROCE.ect.lossyOps = [];


// l = new LimitPNG("../test/1.png")//debug

function fileExists(in_path)
{
    try
    {
        fs.accessSync(in_path, fs.R_OK | fs.W_OK)
    } catch (e)
    {
        console.error(e);
        return false
    }
    return true;
}


getFileSize = function (in_path)
{
    try
    {
        var stat = fs.statSync(in_path)
    } catch (e)
    {
        console.error(e);
        return null
    }

    return stat.size;

}


///------------


// cmds: {
//     //todo:还未完成所有参数：
//     delta_filters: {
//         name: "delta filters",
//             cmd: [
//             {op: "f0", name: "None", miltiSelect: "f"},
//             {op: "f1", name: "Sub", miltiSelect: "f"},
//             {op: "f2", name: "Up", miltiSelect: "f"},
//             {op: "f3", name: "Average", miltiSelect: "f"},
//             {op: "f4", name: "Paeth", miltiSelect: "f"},
//             {op: "f5", name: "Mixed", miltiSelect: "f"},
//             {op: "fe", name: "combination for smallest size"},
//         ]
//     },
// }

module.exports=LimitPNG;