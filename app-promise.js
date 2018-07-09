//为了更好的处理异步请求结果，用以下这个模块
const rp=require('request-promise');

//放置一个分子式中各个不同晶格参数的数组
let mapList=[];
//导入readline模块
const readLine=require('readline');
//控制台的输入输出接口
const rl=readLine.createInterface({
    input:process.stdin,
    output:process.stdout
});
console.log('输入要搜索的分子式')

rl.on('line',async function(line){
    //放置多个分子式的数组
    let formulaArray=[];
    if (line.trim()) {
        formulaArray=line.split(' ');
        for(let index=0;index<formulaArray.length;index++){
            //将每个分子式带入该方法，并且等到方法执行完后才继续遍历
            await getValue(formulaArray[index]);
        }
        console.log('打印结束');
    }
});
rl.on('close', function () {
    console.log('程序结束');
    process.exit(0);
});

//对每个分子式请求，从而获得id参数等列表
async function getValue(formula){
    //获取来自服务器的，以指定化学式（如GaN）的json文件
    let options = {
        uri: 'https://materialsproject.org/apps/materials_explorer/results?query=%7B%22reduced_cell_formula%22%3A%22'+formula+'%22%7D',
        method: 'GET',
        headers: {
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            'Connection': 'keep-alive',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Host': 'materialsproject.org',
            'Referer': 'https://materialsproject.org/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36'
        },
        json:true
    };
    await rp(options)
        .then(function(res){
            for(let i=0;i<res.length;i++){
                let map=new Map();
                map.set('materials_id',res[i].materials_id);
                map.set('formula',res[i].formula);
                map.set('symbol',res[i].spacegroup.symbol);
                map.set('bandgap',res[i]['band_gap (eV)']);
                mapList.push(map);
                //console.log(i);
            }
        })
        .catch(function(err){
        console.log(err);
    });
    await getLatticeValue();
    for(let i=0;i<mapList.length;i++){
        let strLine='';
        mapList[i].forEach(function (item) {
            strLine=strLine+' , '+item.toString();
        });
        console.log(strLine);
    }
    mapList=[];
}

//对每个分子式的参数列表中的每一项进行网络请求，获得晶格常数
async function getLatticeValue(){
    let optionD = {
        uri: '',
        method: 'GET',
        headers: {
            'Accept': '*/*',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            'Connection': 'keep-alive',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Host': 'materialsproject.org',
            'Referer': 'https://materialsproject.org/materials/mp-1434/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36'
        },
        json:true
    };
    for(let i=0;i<mapList.length;i++){
        optionD.uri='https://materialsproject.org/materials/'+mapList[i].get("materials_id")+'/structure';
        //保存晶格常数的a,b,c,alpha,beta,gamma
        //获取参数方式优选选择来自ICSD（无机晶体学数据库）的结果
        //其次才是选择数值模拟计算的结果
        await rp(optionD)
            .then(function (res) {
                if(res.exp_lattice!==null){
                    mapList[i].set('latticeFrom','ICSD');
                    mapList[i].set('a',res.exp_lattice.a);
                    mapList[i].set('b',res.exp_lattice.b);
                    mapList[i].set('c',res.exp_lattice.c);
                    mapList[i].set('alpha',res.exp_lattice.alpha);
                    mapList[i].set('beta',res.exp_lattice.beta);
                    mapList[i].set('gamma',res.exp_lattice.gamma);
                }else {
                    mapList[i].set('latticeFrom','computed');
                    mapList[i].set('a',res.structure.lattice.a);
                    mapList[i].set('b',res.structure.lattice.b);
                    mapList[i].set('c',res.structure.lattice.c);
                    mapList[i].set('alpha',res.structure.lattice.alpha);
                    mapList[i].set('beta',res.structure.lattice.beta);
                    mapList[i].set('gamma',res.structure.lattice.gamma);
                }
            }).catch(function (err) {
                console.log(err);
            });
    }
}