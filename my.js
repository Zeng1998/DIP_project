var MyCanvas = function () {
        //主画布
        let canvas, ctx, cWidth, cHeight;
        //图片实际画布(图像的实际操作)，bCanvas大小等于iWidth和iHeight
        let bCanvas, bCtx;
        //图片
        let image, image_100, iWidth, iHeight;
        //图片在主画布中的位置
        let x=0, y=0;
        //导航栏
        let navigator, nCanvas, nCtx;
        //缩放面板
        let scalePanel;
        //缩放相关系数
        let scale = 1, scaleStep = 0.1, minScale = 0.0008, maxScale = 32;
        //撤回重做栈
        var undo_sta = [];
        var redo_sta = [];
        //裁剪窗口位置和大小
        var cutX, cutY, cutW, cutH;
        //图片拖拽至边缘的最小显示，防止被拖出画布
        var appearSize = 80;
        var prevX = 0, prevY = 0;
        // 拖动开关
        var dragOn = false;
        // 可调整截图框
        var oRelDiv = null;
        var setFlag=false;

        function getImageSize() {
            return {'width': iWidth, 'height': iHeight};
        }

        //初始化
        function initial(options) {
            //画布
            canvas = options.canvas;
            ctx = canvas.getContext('2d');
            cWidth = canvas.clientWidth;
            cHeight = canvas.clientHeight;
            //画布添加点击事件(显示坐标和像素属性)和滚轮事件(缩放)
            canvas.addEventListener('mousedown', handleMouseDown);
            canvas.addEventListener('mousewheel', handleMouseWheel);
            canvas.addEventListener('DOMMouseScroll', handleMouseWheelFirefox);
            
            //导航控件
            navigator = options.navigator;
            nCanvas = options.nCanvas;
            nCtx = nCanvas.getContext('2d');
            navigator.addEventListener('click', handleNavigatorClick);
            //百分比显示控件
            scalePanel = options.scalePanel;
        }

        //将图片设置到canvas上
        function setImage(img) {
            image = img;
            image.addEventListener('load', function () {
                iWidth = image.width;
                iHeight = image.height;
                //打开图片后，更新导航栏高度
                nCanvas.height = nCanvas.width * iHeight / iWidth;
                //删除上一张图片的导航栏
                var pre = document.querySelector('nCanvas');
                if (pre !== null) {
                    navigator.removeChild(pre);
                }
                navigator.appendChild(nCanvas);
                //图片对应的画布(隐藏)
                bCanvas = document.querySelector("#iCanvas");
                bCanvas.width = iWidth;
                bCanvas.height = iHeight;
                bCtx = bCanvas.getContext('2d')
                bCtx.drawImage(image, 0, 0, iWidth, iHeight);
                setXY(x,y)
                if(!setFlag){
                    image_100 = {'src':img.src,'width':img.width,'height':img.height};
                    setFlag=true;
                }
            })
        }

        //设置拖动标志
        function setDrag(o) {
            dragOn = o;
        }

        //负片效果
        function neg() {
            //imageData是一个一维数组，按顺序每连续4位表示一个像素点属性。
            var imageData = bCtx.getImageData(0, 0, bCanvas.width, bCanvas.height);
            //允许撤销
            var r={'data':new Uint8ClampedArray(imageData.data),'width':iWidth,'height':iHeight};
            undo_sta.push(r);
            //图像处理
            for (var i = 0; i < imageData.data.length; i += 4) {
                imageData.data[i] = 255 - imageData.data[i];
                imageData.data[i + 1] = 255 - imageData.data[i + 1];
                imageData.data[i + 2] = 255 - imageData.data[i + 2];
            }
            //重新绘制
            bCtx.putImageData(imageData, 0, 0);
            image.width=bCanvas.width;
            image.height=bCanvas.height;
            image.src = bCanvas.toDataURL("image/png"); 
            update()
        }

        //灰度化
        function gray() {
            var imageData = bCtx.getImageData(0, 0, bCanvas.width, bCanvas.height);
            var r={'data':new Uint8ClampedArray(imageData.data),'width':iWidth,'height':iHeight};
            undo_sta.push(r);
            for (var i = 0; i < imageData.data.length; i += 4) {
                var red = imageData.data[i];
                var green = imageData.data[i + 1];
                var blue = imageData.data[i + 2];
                //根据公式求灰度值
                var gray = 0.3 * red + 0.59 * green + 0.11 * blue;
                imageData.data[i] = gray;
                imageData.data[i + 1] = gray;
                imageData.data[i + 2] = gray;
            }
            bCtx.putImageData(imageData, 0, 0);
            image.width=bCanvas.width;
            image.height=bCanvas.height;
            image.src = bCanvas.toDataURL("image/png"); 
            update();
        }

        //二值化
        function binary() {
            var thred = 255 / 2;
            var imageData = bCtx.getImageData(0, 0, bCanvas.width, bCanvas.height);
            var r={'data':new Uint8ClampedArray(imageData.data),'width':iWidth,'height':iHeight};
            undo_sta.push(r);
            for (var i = 0; i < imageData.data.length; i += 4) {
                var red = imageData.data[i];
                var green = imageData.data[i + 1];
                var blue = imageData.data[i + 2];
                var st = ((red + green + blue) / 3) > thred ? 255 : 0;
                imageData.data[i] = st;
                imageData.data[i + 1] = st;
                imageData.data[i + 2] = st;
            }
            bCtx.putImageData(imageData, 0, 0);
            image.width=bCanvas.width;
            image.height=bCanvas.height;
            image.src = bCanvas.toDataURL("image/png"); 
            update();
        }

        function edge(){
            // kernel=[-1, -1, -1, -1, 8, -1, -1, -1, -1]            
            // var imageData = bCtx.getImageData(0, 0, bCanvas.width, bCanvas.height);
            // var r={'data':new Uint8ClampedArray(imageData.data),'width':iWidth,'height':iHeight};
            // undo_sta.push(r);
            // var iD = imageData.data;
            // var w=bCanvas.width;
            // var h=bCanvas.height;
            // console.log(imageData.data[804])
            // for (let y = 1; y < h - 1; y += 1) {
            //     for (let x = 1; x < w - 1; x += 1) {
            //         // for (let c = 0; c < 3; c += 1) {
            //         //     let i = (y * w + x) * 4 + c
            //         //     tt=(kernel[0] * iD[i - w * 4 - 4] +
            //         //         kernel[1] * iD[i - w * 4] +
            //         //         kernel[2] * iD[i - w * 4 + 4] +
            //         //         kernel[3] * iD[i - 4] +
            //         //         kernel[4] * iD[i] +
            //         //         kernel[5] * iD[i + 4] +
            //         //         kernel[6] * iD[i + w * 4 - 4] +
            //         //         kernel[7] * iD[i + w * 4] +
            //         //         kernel[8] * iD[i + w * 4 + 4])
            //         //     imageData.data[i] = (tt>255?255:(tt<0?0:tt));
            //         //     if(y===1 && x===1){
            //         //         console.log(i,tt,imageData.data[i]);
                            
            //         //     }
            //         // }
            //                 for (var c = 0; c < 3; c += 1) {
            //                     var i = (y*w + x)*4 + c;
            //                     imageData.data[i] = 127 + -iD[i - w*4 - 4] -  iD[i - w*4] - iD[i - w*4 + 4] +
            //                             -iD[i - 4]       + 8*iD[i]       - iD[i + 4] +
            //                             -iD[i + w*4 - 4] - iD[i + w*4] - iD[i + w*4 + 4];
            //                 }
            //                 imageData.data[(y*w + x)*4 + 3] = 255; // alpha
            //     }
            // }
            // console.log(imageData.data[804]);
            // console.log(iD==imageData.data);
            
            // bCtx.putImageData(imageData, 0, 0);
            // image.width=bCanvas.width;
            // image.height=bCanvas.height;
            // image.src = bCanvas.toDataURL("image/png"); 
            // update();

        }

        //模板滤波
        function template(tempObj) {
            var imageData = bCtx.getImageData(0, 0, bCanvas.width, bCanvas.height);
            var r={'data':new Uint8ClampedArray(imageData.data),'width':iWidth,'height':iHeight};
            undo_sta.push(r);
            var data=imageData.data;
            var lHeight=bCanvas.height;
            var lWidth=bCanvas.width;
            const { iTempW, iTempH, iTempMX, iTempMY, fpArray, fCoef } = tempObj;
            // 保存原始数据
            const dataInit = [];
            for (let i = 0, len = data.length; i < len; i++) {
                dataInit[i] = data[i];
            }
            // 行(除去边缘几行)
            for (let i = iTempMY; i < lHeight - iTempMY - 1; i++) {
                // 列(除去边缘几列)
                for (let j = iTempMX; j < lWidth - iTempMX - 1; j++) {
                    const count = (i * lWidth + j) * 4;
                    const fResult = [0, 0, 0];
                    for (let k = 0; k < iTempH; k++) {
                        for (let l = 0; l < iTempW; l++) {
                            const weight = fpArray[k * iTempW + l];
                            const y = i - iTempMY + k;
                            const x = j - iTempMX + l;
                            const key = (y * lWidth + x) * 4;
                            // 保存像素值
                            for (let i = 0; i < 3; i++) {
                                fResult[i] += dataInit[key + i] * weight;
                            }
                        }
                    }
                    for (let i = 0; i < 3; i++) {
                        // 乘上系数
                        fResult[i] *= fCoef;
                        // 取绝对值
                        fResult[i] = Math.abs(fResult[i]);
                        fResult[i] = fResult[i] > 255 ? 255 : Math.ceil(fResult[i]);
                        // 将修改后的值放回去
                        data[count + i] = fResult[i];
                    }
                }
            }
            imageData.data=data;
            bCtx.putImageData(imageData, 0, 0);
            image.width=bCanvas.width;
            image.height=bCanvas.height;
            image.src = bCanvas.toDataURL("image/png"); 
            update();
        }

        //添加水印
        function water(str,locX,locY){
            var imageData = bCtx.getImageData(0, 0, bCanvas.width, bCanvas.height);
            var r={'data':new Uint8ClampedArray(imageData.data),'width':iWidth,'height':iHeight};
            undo_sta.push(r);
            var markCanvas = document.createElement("canvas");
            var markContext = markCanvas.getContext('2d');
            markCanvas.width = 150;
            markCanvas.height = 40;
            markContext.font = "20px serif";
            markContext.fillStyle = "rgba(255, 255, 255, 0.5)";
            markContext.fillText(str, 0, 20);
            bCtx.putImageData(imageData, 0, 0);
            bCtx.drawImage(markCanvas,locX,locY);
            image.width=bCanvas.width;
            image.height=bCanvas.height;
            image.src = bCanvas.toDataURL("image/png"); 
            update();
        }

        //单色通道提取
        function single(color) {
            var imageData = bCtx.getImageData(0, 0, bCanvas.width, bCanvas.height);
            var r={'data':new Uint8ClampedArray(imageData.data),'width':iWidth,'height':iHeight};
            undo_sta.push(r);
            for (var i = 0; i < imageData.data.length; i += 4) {
                if (color === "red") {
                    imageData.data[i + 1] = 0;
                    imageData.data[i + 2] = 0;
                } else if (color === "green") {
                    imageData.data[i] = 0;
                    imageData.data[i + 2] = 0;
                } else if (color === "blue") {
                    imageData.data[i] = 0;
                    imageData.data[i + 1] = 0;
                }

            }
            bCtx.putImageData(imageData, 0, 0);
            image.width=bCanvas.width;
            image.height=bCanvas.height;
            image.src = bCanvas.toDataURL("image/png"); 
            update();
        }

        //撤销
        function undo() {
            var imageData = bCtx.getImageData(0, 0, bCanvas.width, bCanvas.height);
            var r={'data':new Uint8ClampedArray(imageData.data),'width':iWidth,'height':iHeight};
            redo_sta.push(r);
            if (undo_sta.length === 0) {
                layer.msg('没有可以撤销的');
                return;
            }
            var s=undo_sta.pop();
            iWidth=bCanvas.width=s.width;
            iHeight=bCanvas.height=s.height;
            var c = new ImageData(s.data, bCanvas.width, bCanvas.height);
            bCtx.putImageData(c, 0, 0);
            image.width=bCanvas.width;
            image.height=bCanvas.height;
            image.src = bCanvas.toDataURL("image/png"); 
            update();
        }

        //重做
        function redo() {
            var imageData = bCtx.getImageData(0, 0, bCanvas.width, bCanvas.height);
            var r={'data':new Uint8ClampedArray(imageData.data),'width':iWidth,'height':iHeight};
            undo_sta.push(r);
            if (redo_sta.length === 0) {
                layer.msg('没有可以重做的');
                return;
            }
            var s=redo_sta.pop();
            iWidth=bCanvas.width=s.width;
            iHeight=bCanvas.height=s.height;
            var c = new ImageData(s.data, bCanvas.width, bCanvas.height);
            bCtx.putImageData(c, 0, 0);
            image.width=bCanvas.width;
            image.height=bCanvas.height;
            image.src = bCanvas.toDataURL("image/png"); 
            update();
        }

        //保存
        function save(filename) {
            type = 'png';
            var imgdata = bCanvas.toDataURL(type).replace('image/' + type, 'image/octet-stream');
            filename =filename + '.' + type;
            var saveFile = function (data, filename) {
                var link = document.createElement('a');
                link.href = data;
                link.download = filename;
                var event = document.createEvent('MouseEvents');
                event.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
                link.dispatchEvent(event);
            };
            saveFile(imgdata, filename);
        }

        //清空画布
        function quit() {
            var imageData = bCtx.getImageData(0, 0, bCanvas.width, bCanvas.height);
            var r={'data':new Uint8ClampedArray(imageData.data),'width':iWidth,'height':iHeight};
            undo_sta.push(r);
            bCtx.clearRect(0, 0, bCanvas.width, bCanvas.height);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            nCtx.clearRect(0, 0, nCanvas.width, nCanvas.height);
            nCanvas.height = 120;
        }

        //均值滤波
        function average(siz, times) {
            var imageData = bCtx.getImageData(0, 0, bCanvas.width, bCanvas.height);
            var r={'data':new Uint8ClampedArray(imageData.data),'width':iWidth,'height':iHeight};
            undo_sta.push(r);
            for (var t = 0; t < times; t++) {
                var tmppixelData = imageData.data;
                var size = size || 3;
                var count = Math.pow(size, 2);
                for (var i = 0; i < bCanvas.height; i++) {
                    for (var j = 0; j < bCanvas.width; j++) {
                        var totalr = 0, totalg = 0, totalb = 0;
                        for (var dx = 0; dx < size; dx++) {
                            for (var dy = 0; dy < size; dy++) {
                                var x = i + dx;
                                var y = j + dy;
                                var p = x * bCanvas.width + y;
                                totalr += tmppixelData[p * 4];
                                totalg += tmppixelData[p * 4 + 1];
                                totalb += tmppixelData[p * 4 + 2];
                            }
                        }
                        var p = i * bCanvas.width + j;
                        imageData.data[p * 4] = totalr / count;
                        imageData.data[p * 4 + 1] = totalg / count;
                        imageData.data[p * 4 + 2] = totalb / count;
                    }
                }
            }
            bCtx.putImageData(imageData, 0, 0);
            image.width=bCanvas.width;
            image.height=bCanvas.height;
            image.src = bCanvas.toDataURL("image/png"); 
            update();
        }

        //中值滤波
        function median(size, times) {
            var imageData = bCtx.getImageData(0, 0, bCanvas.width, bCanvas.height);
            var r={'data':new Uint8ClampedArray(imageData.data),'width':iWidth,'height':iHeight};
            undo_sta.push(r);
            for (var t = 0; t < times; t++) {
                var tmppixelData = imageData.data;
                var size = size || 3;
                for (var i = 0; i < bCanvas.height; i++) {
                    for (var j = 0; j < bCanvas.width; j++) {
                        var tempR = [], tempG = [], tempB = [];
                        for (var dx = 0; dx < size; dx++) {
                            for (var dy = 0; dy < size; dy++) {
                                var x = i + dx;
                                var y = j + dy;
                                var p = x * bCanvas.width + y;
                                tempR.push(tmppixelData[p * 4]);
                                tempG.push(tmppixelData[p * 4 + 1]);
                                tempB.push(tmppixelData[p * 4 + 2]);
                            }
                        }
                        tempR.sort();
                        tempG.sort();
                        tempB.sort();
                        var index = Math.ceil(size * size / 2);
                        var p = i * bCanvas.width + j;
                        imageData.data[p * 4] = tempR[index];
                        imageData.data[p * 4 + 1] = tempG[index];
                        imageData.data[p * 4 + 2] = tempB[index];
                    }
                }
            }
            bCtx.putImageData(imageData, 0, 0);
            image.width=bCanvas.width;
            image.height=bCanvas.height;
            image.src = bCanvas.toDataURL("image/png"); 
            update();
        }

        //最大最小值滤波
        function maxMin(size, times) {
            var imageData = bCtx.getImageData(0, 0, bCanvas.width, bCanvas.height);
            var r={'data':new Uint8ClampedArray(imageData.data),'width':iWidth,'height':iHeight};
            undo_sta.push(r);
            for (var t = 0; t < times; t++) {
                var tmppixelData = imageData.data;
                size = size || 3;
                for (var i = 0; i < bCanvas.height; i++) {
                    for (var j = 0; j < bCanvas.width; j++) {
                        var tempR = [], tempG = [], tempB = [];
                        for (var dx = 0; dx < size; dx++) {
                            for (var dy = 0; dy < size; dy++) {
                                var x = i + dx;
                                var y = j + dy;
                                var p = x * bCanvas.width + y;
                                if (!(dx === Math.ceil(size / 2) && dy === Math.ceil(size / 2))) {
                                    tempR.push(tmppixelData[p * 4]);
                                    tempG.push(tmppixelData[p * 4 + 1]);
                                    tempB.push(tmppixelData[p * 4 + 2]);
                                }
                            }
                        }
                        tempR.sort();
                        tempG.sort();
                        tempB.sort();
                        var p = i * bCanvas.width + j;
                        imageData.data[p * 4] = tmppixelData[p * 4] > tempR[tempR.length - 1] ? tempR[tempR.length - 1] : tmppixelData[p * 4] < tempR[0] ? tempR[0] : tmppixelData[p * 4];
                        imageData.data[p * 4 + 1] = tmppixelData[p * 4 + 1] > tempG[tempG.length - 1] ? tempG[tempG.length - 1] : tmppixelData[p * 4 + 1] < tempG[0] ? tempG[0] : tmppixelData[p * 4 + 1];
                        imageData.data[p * 4 + 2] = tmppixelData[p * 4 + 2] > tempB[tempB.length - 1] ? tempB[tempB.length - 1] : tmppixelData[p * 4 + 2] < tempB[0] ? tempB[0] : tmppixelData[p * 4 + 2];
                    }
                }
            }
            bCtx.putImageData(imageData, 0, 0);
            image.width=bCanvas.width;
            image.height=bCanvas.height;
            image.src = bCanvas.toDataURL("image/png"); 
            update();
        }

        //水纹滤镜
        function ripple(cx, cy) {
            var imageData = bCtx.getImageData(0, 0, bCanvas.width, bCanvas.height);
            var r={'data':new Uint8ClampedArray(imageData.data),'width':iWidth,'height':iHeight};
            undo_sta.push(r);
            var height = bCanvas.height;
            var width = bCanvas.width;
            var pixelData = imageData.data;
            var wavelength = 10, phase = 0, amplitude = 2;
            var radius = Math.min(height, width) / 2, radius2 = radius * radius;
            for (var i = 1; i < height; i++) {
                for (var j = 1; j < width; j++) {
                    dx = i - cx;
                    dy = j - cy;
                    var distance2 = dx * dx + dy * dy;
                    if (distance2 > radius2) {
                        tx = i;
                        ty = j;
                    } else {
                        distance = Math.sqrt(distance2);
                        amount = amplitude * Math.sin(distance / wavelength * 2 * Math.PI - phase)
                            * (radius - distance) / radius * wavelength / (distance + 0.0001);
                        tx = i + dx * amount;
                        ty = j + dy * amount;
                    }
                    //这里tx和ty的范围判断决定了边缘的水纹会不会只剩半圆
                    if (tx > 1 && tx < width + 150 && ty < height + 150 && ty > 1) {
                        x1 = Math.floor(tx);
                        y1 = Math.floor(ty);
                        p = tx - x1;
                        q = ty - y1;
                        var r0 = for_img(x1, y1, p, q, 0);
                        var g0 = for_img(x1, y1, p, q, 1);
                        var b0 = for_img(x1, y1, p, q, 2);
                        var p = i * bCanvas.width + j;
                        pixelData[p * 4] = r0;
                        pixelData[p * 4 + 1] = g0;
                        pixelData[p * 4 + 2] = b0;
                    }
                }
            }

            function for_img(xi, yi, p, q, n) {
                return pixelData[(xi * width + yi) * 4 + n] * (1 - p) * (1 - q)
                    + pixelData[(xi * width + yi + 1) * 4 + n] * p * (1 - q)
                    + pixelData[((xi + 1) * width + yi) * 4 + n] * q * (1 - p)
                    + pixelData[((xi + 1) * width + yi + 1) * 4 + n] * p * q
            }

            bCtx.putImageData(imageData, 0, 0);
            image.width=bCanvas.width;
            image.height=bCanvas.height;
            image.src = bCanvas.toDataURL("image/png"); 
            update();
        }

        //摩尔纹滤镜
        function moir(cx, cy) {
            var imageData = bCtx.getImageData(0, 0, bCanvas.width, bCanvas.height);
            var r={'data':new Uint8ClampedArray(imageData.data),'width':iWidth,'height':iHeight};
            undo_sta.push(r);
            var height = bCanvas.height;
            var width = bCanvas.width;
            var pixelData = imageData.data;
            var Degree = 20, beta;
            for (var i = 1; i < height; i++) {
                for (j = 1; j < width; j++) {
                    x0 = j - cx;
                    y0 = cy - i;
                    if (x0 != 0) {
                        beta = Math.atan(y0 / x0);
                    }
                    if (x0 < 0) {
                        beta = beta + Math.PI;
                    } else {
                        beta = Math.PI / 2;
                    }
                    var radius = Math.sqrt(x0 * x0 + y0 * y0);
                    beta = beta + radius * Degree;
                    tx = radius * Math.sin(beta);
                    ty = radius * Math.cos(beta);
                    if (tx > 1 && tx < width && ty < height && ty > 1) {
                        x1 = Math.floor(tx);
                        y1 = Math.floor(ty);
                        p = tx - x1;
                        q = ty - y1;
                        var r0 = for_img(x1, y1, p, q, 0);
                        var g0 = for_img(x1, y1, p, q, 1);
                        var b0 = for_img(x1, y1, p, q, 2);
                        var p = i * width + j;
                        pixelData[p * 4] = r0;
                        pixelData[p * 4 + 1] = g0;
                        pixelData[p * 4 + 2] = b0;
                    }
                }
            }

            function for_img(xi, yi, p, q, n) {
                return pixelData[(xi * width + yi) * 4 + n] * (1 - p) * (1 - q)
                    + pixelData[(xi * width + yi + 1) * 4 + n] * p * (1 - q)
                    + pixelData[((xi + 1) * width + yi) * 4 + n] * q * (1 - p)
                    + pixelData[((xi + 1) * width + yi + 1) * 4 + n] * p * q
            }

            bCtx.putImageData(imageData, 0, 0);
            image.width=bCanvas.width;
            image.height=bCanvas.height;
            image.src = bCanvas.toDataURL("image/png"); 
            update();
        }

        //高斯模糊
        function gaussBlur() {
            var imageData = bCtx.getImageData(0, 0, bCanvas.width, bCanvas.height);
            var r={'data':new Uint8ClampedArray(imageData.data),'width':iWidth,'height':iHeight};
            undo_sta.push(r);
            var pixes = imageData.data;
            var width = imageData.width;
            var height = imageData.height;
            var gaussMatrix = [],
                gaussSum = 0,
                x, y,
                r, g, b, a,
                i, j, k, len;
            var radius = 30;
            var sigma = 5;
            a = 1 / (Math.sqrt(2 * Math.PI) * sigma);
            b = -1 / (2 * sigma * sigma);
            for (i = 0, x = -radius; x <= radius; x++, i++) {
                g = a * Math.exp(b * x * x);
                gaussMatrix[i] = g;
                gaussSum += g;
            }
            for (i = 0, len = gaussMatrix.length; i < len; i++) {
                gaussMatrix[i] /= gaussSum;
            }
            for (y = 0; y < height; y++) {
                for (x = 0; x < width; x++) {
                    r = g = b = a = 0;
                    gaussSum = 0;
                    for (j = -radius; j <= radius; j++) {
                        k = x + j;
                        if (k >= 0 && k < width) {
                            i = (y * width + k) * 4;
                            r += pixes[i] * gaussMatrix[j + radius];
                            g += pixes[i + 1] * gaussMatrix[j + radius];
                            b += pixes[i + 2] * gaussMatrix[j + radius];
                            gaussSum += gaussMatrix[j + radius];
                        }
                    }
                    i = (y * width + x) * 4;
                    pixes[i] = r / gaussSum;
                    pixes[i + 1] = g / gaussSum;
                    pixes[i + 2] = b / gaussSum;
                }
            }
            for (x = 0; x < width; x++) {
                for (y = 0; y < height; y++) {
                    r = g = b = a = 0;
                    gaussSum = 0;
                    for (j = -radius; j <= radius; j++) {
                        k = y + j;
                        if (k >= 0 && k < height) {//确保 k 没超出 y 的范围
                            i = (k * width + x) * 4;
                            r += pixes[i] * gaussMatrix[j + radius];
                            g += pixes[i + 1] * gaussMatrix[j + radius];
                            b += pixes[i + 2] * gaussMatrix[j + radius];
                            gaussSum += gaussMatrix[j + radius];
                        }
                    }
                    i = (y * width + x) * 4;
                    pixes[i] = r / gaussSum;
                    pixes[i + 1] = g / gaussSum;
                    pixes[i + 2] = b / gaussSum;
                }
            }
            bCtx.putImageData(imageData, 0, 0);
            image.width=bCanvas.width;
            image.height=bCanvas.height;
            image.src = bCanvas.toDataURL("image/png"); 
            update();
        }

        //浮雕效果
        function sculpture() {
            var imageData = bCtx.getImageData(0, 0, bCanvas.width, bCanvas.height);
            var r={'data':new Uint8ClampedArray(imageData.data),'width':iWidth,'height':iHeight};
            undo_sta.push(r);
            var height = bCanvas.height;
            var width = bCanvas.width;
            var tempCanvasData = imageData.data;
            for (var tx = 1; tx < width - 1; tx++) {
                for (var ty = 1; ty < height - 1; ty++) {
                    //减去对角线右下
                    var idx = (tx + ty * width) * 4;
                    var bidx = ((tx + 1) + (ty + 1) * width) * 4;
                    var nr = imageData.data[idx] - tempCanvasData[bidx] + 128;
                    var ng = imageData.data[idx + 1] - tempCanvasData[bidx + 1] + 128;
                    var nb = imageData.data[idx + 2] - tempCanvasData[bidx + 2] + 128;
                    nr = (nr < 0) ? 0 : ((nr > 255) ? 255 : nr);
                    ng = (ng < 0) ? 0 : ((ng > 255) ? 255 : ng);
                    nb = (nb < 0) ? 0 : ((nb > 255) ? 255 : nb);
                    imageData.data[idx] = nr;
                    imageData.data[idx + 1] = ng;
                    imageData.data[idx + 2] = nb;
                    imageData.data[idx + 3] = 255;
                }
            }
            bCtx.putImageData(imageData, 0, 0);
            image.width=bCanvas.width;
            image.height=bCanvas.height;
            image.src = bCanvas.toDataURL("image/png"); 
            update();
        }

        //最邻近插值
        function resize_nearest(newWidth, newHeight) {
            var imageData = bCtx.getImageData(0, 0, bCanvas.width, bCanvas.height);
            var r={'data':new Uint8ClampedArray(imageData.data),'width':iWidth,'height':iHeight};
            undo_sta.push(r);
            var height = bCanvas.height;
            var width = bCanvas.width;
            var scaleW = newWidth / width;
            var scaleH = newHeight / height;
            var dstData = new Uint8ClampedArray(newHeight * newWidth * 4);
            const filter1 = (dstCol, dstRow) => {
                const srcCol = Math.min(width - 1, dstCol / scaleW);
                const srcRow = Math.min(height - 1, dstRow / scaleH);
                const intCol = Math.floor(srcCol);
                const intRow = Math.floor(srcRow);
                let dstI = (dstRow * newWidth) + dstCol;
                let srcI = (intRow * width) + intCol;
                dstI *= 4;
                srcI *= 4;
                for (let j = 0; j <= 3; j += 1) {
                    dstData[dstI + j] = imageData.data[srcI + j];
                }
            };
            for (let col = 0; col < newWidth; col += 1) {
                for (let row = 0; row < newHeight; row += 1) {
                    filter1(col, row);
                }
            }
            //ImageData的data属性是只读
            imageData = new ImageData(dstData, newWidth, newHeight);
            //修改图片大小要更新iWidth,iHeight,bCanvas,bCtx,nCanvas
            bCanvas.width = newWidth;
            bCanvas.height = newHeight;
            iWidth = newWidth;
            iHeight = newHeight;
            nCanvas.height = nCanvas.width * iHeight / iWidth;
            bCtx = bCanvas.getContext('2d');
            bCtx.putImageData(imageData, 0, 0);
            image.width=bCanvas.width;
            image.height=bCanvas.height;
            image.src = bCanvas.toDataURL("image/png"); 
            update();
        }

        //双线性插值
        function resize_bilinear(newWidth, newHeight) {
            var imageData = bCtx.getImageData(0, 0, bCanvas.width, bCanvas.height);
            var r={'data':new Uint8ClampedArray(imageData.data),'width':iWidth,'height':iHeight};
            undo_sta.push(r);
            var height = bCanvas.height;
            var width = bCanvas.width;
            var scaleW = newWidth / width;
            var scaleH = newHeight / height;
            var dstData = new Uint8ClampedArray(newHeight * newWidth * 4);
            const filter2 = (dstCol, dstRow) => {
                const srcCol = Math.min(width - 1, dstCol / scaleW);
                const srcRow = Math.min(height - 1, dstRow / scaleH);
                const intCol = Math.floor(srcCol);
                const intRow = Math.floor(srcRow);
                const u = srcCol - intCol;
                const v = srcRow - intRow;
                const u1 = 1 - u;
                const v1 = 1 - v;
                let dstI = (dstRow * newWidth) + dstCol;
                dstI *= 4;
                const rgba00 = getRGBAValue(
                    imageData.data,
                    width,
                    height,
                    intRow,
                    intCol,
                );
                const rgba01 = getRGBAValue(
                    imageData.data,
                    width,
                    height,
                    intRow,
                    intCol + 1,
                );
                const rgba10 = getRGBAValue(
                    imageData.data,
                    width,
                    height,
                    intRow + 1,
                    intCol,
                );
                const rgba11 = getRGBAValue(
                    imageData.data,
                    width,
                    height,
                    intRow + 1,
                    intCol + 1,
                );
                for (let j = 0; j <= 3; j += 1) {
                    const partV = v * ((u1 * rgba10[j]) + (u * rgba11[j]));
                    const partV1 = v1 * ((u1 * rgba00[j]) + (u * rgba01[j]));
                    dstData[dstI + j] = partV + partV1;
                }
            };
            for (let col = 0; col < newWidth; col += 1) {
                for (let row = 0; row < newHeight; row += 1) {
                    filter2(col, row);
                }
            }
            imageData = new ImageData(dstData, newWidth, newHeight);
            bCanvas.width = newWidth;
            bCanvas.height = newHeight;
            iWidth = newWidth;
            iHeight = newHeight;
            nCanvas.height = nCanvas.width * iHeight / iWidth;
            bCtx = bCanvas.getContext('2d');
            bCtx.putImageData(imageData, 0, 0);
            image.width=bCanvas.width;
            image.height=bCanvas.height;
            image.src = bCanvas.toDataURL("image/png"); 
            update();
        }

        //获取某行某列的像素对于的rgba值
        function getRGBAValue(data, srcWidth, srcHeight, row, col) {
            let newRow = row;
            let newCol = col;
            if (newRow >= srcHeight) {
                newRow = srcHeight - 1;
            } else if (newRow < 0) {
                newRow = 0;
            }
            if (newCol >= srcWidth) {
                newCol = srcWidth - 1;
            } else if (newCol < 0) {
                newCol = 0;
            }
            let newIndex = (newRow * srcWidth) + newCol;
            newIndex *= 4;
            return [
                data[newIndex],
                data[newIndex + 1],
                data[newIndex + 2],
                data[newIndex + 3],
            ];
        }

        //双立方插值
        function resize_bicubic(newWidth, newHeight) {
            var imageData = bCtx.getImageData(0, 0, bCanvas.width, bCanvas.height);
            var r={'data':new Uint8ClampedArray(imageData.data),'width':iWidth,'height':iHeight};
            undo_sta.push(r);
            var height = bCanvas.height;
            var width = bCanvas.width;
            var scaleW = newWidth / width;
            var scaleH = newHeight / height;
            var dstData = new Uint8ClampedArray(newHeight * newWidth * 4);
            const filter = (dstCol, dstRow) => {
                const srcCol = Math.min(width - 1, dstCol / scaleW);
                const srcRow = Math.min(height - 1, dstRow / scaleH);
                const intCol = Math.floor(srcCol);
                const intRow = Math.floor(srcRow);
                const u = srcCol - intCol;
                const v = srcRow - intRow;
                let dstI = (dstRow * newWidth) + dstCol;
                dstI *= 4;
                const rgbaData = [0, 0, 0, 0];
                for (let m = -1; m <= 2; m += 1) {
                    for (let n = -1; n <= 2; n += 1) {
                        const rgba = getRGBAValue(
                            imageData.data,
                            width,
                            height,
                            intRow + m,
                            intCol + n,
                        );
                        const f1 = interpolationCalculate(m - v);
                        const f2 = interpolationCalculate(n - u);
                        const weight = f1 * f2;
                        rgbaData[0] += rgba[0] * weight;
                        rgbaData[1] += rgba[1] * weight;
                        rgbaData[2] += rgba[2] * weight;
                        rgbaData[3] += rgba[3] * weight;
                    }
                }
                dstData[dstI + 0] = getPixelValue(rgbaData[0]);
                dstData[dstI + 1] = getPixelValue(rgbaData[1]);
                dstData[dstI + 2] = getPixelValue(rgbaData[2]);
                dstData[dstI + 3] = getPixelValue(rgbaData[3]);
            };
            // 区块
            for (let col = 0; col < newWidth; col += 1) {
                for (let row = 0; row < newHeight; row += 1) {
                    filter(col, row);
                }
            }
            imageData = new ImageData(dstData, newWidth, newHeight);
            bCanvas.width = newWidth;
            bCanvas.height = newHeight;
            iWidth = newWidth;
            iHeight = newHeight;
            nCanvas.height = nCanvas.width * iHeight / iWidth;
            bCtx = bCanvas.getContext('2d');
            bCtx.putImageData(imageData, 0, 0);
            image.width=bCanvas.width;
            image.height=bCanvas.height;
            image.src = bCanvas.toDataURL("image/png"); 
            update();
        }

        const A = -1;
        function interpolationCalculate(x) {
            const absX = x >= 0 ? x : -x;
            const x2 = x * x;
            const x3 = absX * x2;
            if (absX <= 1) {
                return 1 - (A + 3) * x2 + (A + 2) * x3;
            } else if (absX <= 2) {
                return -4 * A + 8 * A * absX - 5 * A * x2 + A * x3;
            }
            return 0;
        }

        function getPixelValue(pixelValue) {
            let newPixelValue = pixelValue;
            newPixelValue = Math.min(255, newPixelValue);
            newPixelValue = Math.max(0, newPixelValue);
            return newPixelValue;
        }

        //更新导航栏
        function update() {     
             // setImage(newImage);
            var nWidth = nCanvas.width;
            var rect = document.querySelector(".navWindow");
            //画到主canvas上
            ctx.clearRect(0, 0, cWidth, cHeight)            
            ctx.drawImage(bCanvas, -x / scale, -y / scale, cWidth / scale, cHeight / scale, 0, 0, cWidth, cHeight)
            nCtx.clearRect(0, 0, nWidth, nWidth * iHeight / iWidth)
            nCtx.drawImage(bCanvas, 0, 0, iWidth, iHeight, 0, 0, nWidth, nWidth * iHeight / iWidth)
            rect.style.left = -x * nWidth / (iWidth * scale) + 'px'
            rect.style.top = -y * nWidth / (iWidth * scale) + 'px';
            rect.style.color = 'red';
            var width = nWidth * cWidth / iWidth / scale
            if (width !== Number(rect.style.width)) {
                rect.style.width = width + 'px'
                rect.style.height = width * cHeight / cWidth + 'px'
            }
            scalePanel.innerText = (scale * 100).toFixed(2) + '%'            
        }

        //处理拖动
        function handleDrag(e) {         
            var p = calculateChange(e, canvas)
            var offsetX = (p.x - prevX)
            var offsetY = (p.y - prevY)
            setXY(x + offsetX, y + offsetY)
            prevX = p.x
            prevY = p.y
        }

        function handleMouseDown(e) {
            var prevP = calculateChange(e, canvas)
            var ix = Math.floor((prevP.x - x) / scale)
            var iy = Math.floor((prevP.y - y) / scale)
            prevX = prevP.x
            prevY = prevP.y
            if (dragOn) {
                window.addEventListener('mousemove', handleDrag)
                window.addEventListener('mouseup', handleMouseUp)
            }
            var colorData = bCtx.getImageData(ix, iy, 1, 1).data
            //输出画布点击位置的信息
            var rEle = document.querySelector('.r')
            var gEle = document.querySelector('.g')
            var bEle = document.querySelector('.b')
            var aEle = document.querySelector('.a')
            var xEle = document.querySelector('.x')
            var yEle = document.querySelector('.y')
            v = {
                x: ix,
                y: iy,
                color: {
                    r: colorData[0],
                    g: colorData[1],
                    b: colorData[2],
                    a: Number((colorData[3] / 255).toFixed(2))
                }
            };
            rEle.value = v.color.r;
            gEle.value = v.color.g;
            bEle.value = v.color.b;
            aEle.value = v.color.a;
            xEle.value = v.x;
            yEle.value = v.y;
        }

        function handleMouseUp(e) {
            window.removeEventListener('mousemove', handleDrag)
            window.removeEventListener('mousemove', handleMouseUp)
        }

        //导航栏点击处理
        function handleNavigatorClick(e) {
            var nWidth = nCanvas.width;
            var p = calculateChange(e, navigator)
            var tmpX = cWidth / 2 - iWidth * scale * p.x / nWidth
            var tmpY = cHeight / 2 - iWidth * scale * p.x / nWidth * p.y / p.x
            setXY(tmpX, tmpY)
        }

        //滑轮滚动缩放
        function handleMouseWheel(e) {            
            //计算缩放比例
            var wd = e.wheelDelta;
            var newScale = scale * (1 + (wd > 0 ? scaleStep : -scaleStep));
            newScale = Math.max(newScale, minScale);
            newScale = Math.min(newScale, maxScale);
            //p是当前放缩中心点的坐标(图片坐标轴)
            var p = calculateChange(e, canvas);
            var newX = (x - p.x) * newScale / scale + p.x;
            var newY = (y - p.y) * newScale / scale + p.y;
            scale = newScale;
            setXY(newX, newY)
        }

        function handleMouseWheelFirefox(e) {            
            //计算缩放比例
            var wd = -e.detail;
            var newScale = scale * (1 + (wd > 0 ? scaleStep : -scaleStep));
            newScale = Math.max(newScale, minScale);
            newScale = Math.min(newScale, maxScale);
            //p是当前放缩中心点的坐标(图片坐标轴)
            var p = calculateChange(e, canvas);
            var newX = (x - p.x) * newScale / scale + p.x;
            var newY = (y - p.y) * newScale / scale + p.y;
            scale = newScale;
            setXY(newX, newY)
        }

        //设置xy，防止图片被拖出画布
        function setXY(vx, vy) {            
            if (vx < appearSize - iWidth * scale) {
                x = appearSize - iWidth * scale
            } else if (vx > cWidth - appearSize) {
                x = cWidth - appearSize
            } else {
                x = vx
            }
            if (vy < appearSize - iHeight * scale) {
                y = appearSize - iHeight * scale
            } else if (vy > cHeight - appearSize) {
                y = cHeight - appearSize
            } else {
                y = vy
            }            
            update()
        }

        /* 计算鼠标事件相对容器的位置 */
        function calculateChange(e, container) {
            const containerWidth = container.clientWidth
            const containerHeight = container.clientHeight
            const x = typeof e.pageX === 'number' ? e.pageX : e.touches[0].pageX
            const y = typeof e.pageY === 'number' ? e.pageY : e.touches[0].pageY
            let left = x - (container.getBoundingClientRect().left + window.pageXOffset)
            let top = y - (container.getBoundingClientRect().top + window.pageYOffset)

            if (left < 0) {
                left = 0
            } else if (left > containerWidth) {
                left = containerWidth
            }
            if (top < 0) {
                top = 0
            } else if (top > containerHeight) {
                top = containerHeight
            }
            return {
                x: left,
                y: top
            }
        }
        function cut() {
            if (oRelDiv != null) {
                return;
            }
            canvas.style.zIndex = '-1';
            let imgDiv = document.getElementById('container');
            imgDiv.appendChild(canvas);
            oRelDiv = document.createElement("div"); // 截图框
            oRelDiv.innerHTML = '';
            oRelDiv.style.position = "absolute";
            oRelDiv.style.width = iWidth*scale + "px";
            oRelDiv.style.height = iHeight*scale + "px";
            var ay=(105+Math.max(0,y));
            var ax=(Math.max(0,x));
            oRelDiv.style.top = ay+"px";
            oRelDiv.style.left = ax+"px";
            oRelDiv.id = "cropContainer";
            
            canvas.parentNode.insertBefore(oRelDiv, canvas);
            cutW = 80;
            cutH = 80;
            //这个是相对cropContainer的
            cutX = iWidth / 2 - cutW / 2;// 截图框左上角x坐标
            cutY = iHeight / 2 - cutH / 2;    // 截图框左上角y坐标
            //截图框
            oRelDiv.innerHTML = '<div id="zxxCropBox" style="height:' + cutH + 'px; width:' + cutW + 'px; position:absolute; left:' +
                cutX + 'px; top:' + cutY + 'px; border:1px solid black;">' +
                '<div id="zxxDragBg" style="height:100%; background:white; opacity:0.3; filter:alpha(opacity=30); cursor:move"></div>' +
                '<div id="dragLeftTop" style="position:absolute; width:4px; height:4px; border:1px solid #000; background:white; overflow:hidden; left:-3px; top:-3px; cursor:nw-resize;"></div>' +
                '<div id="dragLeftBot" style="position:absolute; width:4px; height:4px; border:1px solid #000; background:white; overflow:hidden; left:-3px; bottom:-3px; cursor:sw-resize;"></div>' +
                '<div id="dragRightTop" style="position:absolute; width:4px; height:4px; border:1px solid #000; background:white; overflow:hidden; right:-3px; top:-3px; cursor:ne-resize;"></div>' +
                '<div id="dragRightBot" style="position:absolute; width:4px; height:4px; border:1px solid #000; background:white; overflow:hidden; right:-3px; bottom:-3px; cursor:se-resize;"></div>' +
                '<div id="dragTopCenter" style="position:absolute; width:4px; height:4px; border:1px solid #000; background:white; overflow:hidden; top:-3px; left:50%; margin-left:-3px; cursor:n-resize;"></div>' +
                '<div id="dragBotCenter" style="position:absolute; width:4px; height:4px; border:1px solid #000; background:white; overflow:hidden; bottom:-3px; left:50%; margin-left:-3px; cursor:s-resize;"></div>' +
                '<div id="dragRightCenter" style="position:absolute; width:4px; height:4px; border:1px solid #000; background:white; overflow:hidden; right:-3px; top:50%; margin-top:-3px; cursor:e-resize;"></div> ' +
                '<div id="dragLeftCenter" style="position:absolute; width:4px; height:4px; border:1px solid #000; background:white; overflow:hidden; left:-3px; top:50%; margin-top:-3px; cursor:w-resize;"></div>' +
                '</div>'

            //拖拽与拉伸方法
            let params = {
                left: 0,
                top: 0,
                width: 0,
                height: 0,
                currentX: 0,
                currentY: 0,
                flag: false,
                kind: "drag"
            };
            // 获取指定元素DOM
            const ID = function (id) {
                return document.getElementById(id);
            };
            //获取相关CSS属性方法
            let getCss = function (o, key) {
                return o.currentStyle ? o.currentStyle[key] : document.defaultView.getComputedStyle(o, false)[key];
            };
            var startDrag = function (point, target, kind) {                
                //point是拉伸点，target是被拉伸的目标，其高度及位置会发生改变
                params.width = getCss(target, "width");
                params.height = getCss(target, "height");
                if (getCss(target, "left") !== "auto") {
                    params.left = getCss(target, "left");
                }
                if (getCss(target, "top") !== "auto") {
                    params.top = getCss(target, "top");
                }
                //target是移动对象
                point.onmousedown = function (event) {                    
                    params.kind = kind;
                    params.flag = true;
                    if (!event) {
                        event = window.event;
                    }
                    var e = event;
                    params.currentX = e.clientX;
                    params.currentY = e.clientY;
                    //防止IE文字选中，有助于拖拽平滑
                    point.onselectstart = function () {
                        return false;
                    };
                    document.onmousemove = function (event) {
                        let e = event ? event : window.event;
                        if (params.flag) {
                            var nowX = e.clientX; // 鼠标移动时x坐标
                            var nowY = e.clientY;   // 鼠标移动时y坐标
                            var disX = nowX - params.currentX;  // 鼠标x方向移动距离
                            var disY = nowY - params.currentY;  // 鼠标y方向移动距离
                            if (params.kind === "n") {
                                target.style.top = parseInt(params.top) + disY + "px";
                                target.style.height = parseInt(params.height) - disY + "px";
                            } else if (params.kind === "w") { 
                                target.style.left = parseInt(params.left) + disX + "px";
                                target.style.width = parseInt(params.width) - disX + "px";
                            } else if (params.kind === "e") {
                                target.style.width = parseInt(params.width) + disX + "px";
                            } else if (params.kind === "s") {
                                target.style.height = parseInt(params.height) + disY + "px";
                            } else if (params.kind === "nw") {
                                target.style.left = parseInt(params.left) + disX + "px";
                                target.style.width = parseInt(params.width) - disX + "px";
                                target.style.top = parseInt(params.top) + disY + "px";
                                target.style.height = parseInt(params.height) - disY + "px";
                            } else if (params.kind === "ne") { 
                                target.style.top = parseInt(params.top) + disY + "px";
                                target.style.height = parseInt(params.height) - disY + "px";
                                target.style.width = parseInt(params.width) + disX + "px";
                            } else if (params.kind === "sw") {
                                target.style.left = parseInt(params.left) + disX + "px";
                                target.style.width = parseInt(params.width) - disX + "px";
                                target.style.height = parseInt(params.height) + disY + "px";
                            } else if (params.kind === "se") {
                                target.style.width = parseInt(params.width) + disX + "px";
                                target.style.height = parseInt(params.height) + disY + "px";
                            } else {
                                target.style.left = parseInt(params.left) + disX + "px";
                                target.style.top = parseInt(params.top) + disY + "px";
                            }
                        }
                        document.onmouseup = function () {
                            params.flag = false;                            
                            if (getCss(target, "left") !== "auto") {
                                params.left = getCss(target, "left");
                            }
                            if (getCss(target, "top") !== "auto") {
                                params.top = getCss(target, "top");
                            }
                            params.width = getCss(target, "width");
                            params.height = getCss(target, "height");
                            //给隐藏文本框赋值                            
                            cutX = parseInt(target.style.left);
                            cutY = parseInt(target.style.top);
                            cutW = parseInt(target.style.width);
                            cutH = parseInt(target.style.height);
                            if (cutX < 0) {
                                cutX = 0;
                            }
                            if (cutY < 0) {
                                cutY = 0;
                            }
                            if ((cutX + cutW) > iWidth) {
                                cutW = iWidth - cutX;
                            }
                            if ((cutY + cutH) > iHeight) {
                                cutH = iHeight - cutY;
                            }
                        };
                    }
                };
            };
            //绑定拖拽和拉伸
            startDrag(ID("zxxDragBg"), ID("zxxCropBox"), "drag");
            startDrag(ID("dragLeftTop"), ID("zxxCropBox"), "nw");
            startDrag(ID("dragLeftBot"), ID("zxxCropBox"), "sw");
            startDrag(ID("dragRightTop"), ID("zxxCropBox"), "ne");
            startDrag(ID("dragRightBot"), ID("zxxCropBox"), "se");
            startDrag(ID("dragTopCenter"), ID("zxxCropBox"), "n");
            startDrag(ID("dragBotCenter"), ID("zxxCropBox"), "s");
            startDrag(ID("dragRightCenter"), ID("zxxCropBox"), "e");
            startDrag(ID("dragLeftCenter"), ID("zxxCropBox"), "w");
            //图片不能被选中，目的使拖拽顺滑
            canvas.onselectstart = function () {
                return false;
            };
            image.onselectstart = function () {
                return false;
            };
        }

        function cutted() {
            var imageData = bCtx.getImageData(0, 0, bCanvas.width, bCanvas.height);
            var r={'data':new Uint8ClampedArray(imageData.data),'width':iWidth,'height':iHeight};
            undo_sta.push(r);
            var t=document.querySelector('#zxxCropBox');
            //x,y是画布之外的，负数
            var vx=x<0?Math.abs(x):0;
            var vy=y<0?Math.abs(y):0;
            cutX=(parseInt(t.style.left)+vx)/scale;
            cutY=(parseInt(t.style.top)+vy)/scale;
            cutW = parseInt(t.style.width)/scale;
            cutH = parseInt(t.style.height)/scale;            
            if (cutX < 0) {
                cutX = 0;
            }
            if (cutY < 0) {
                cutY = 0;
            }
            if ((cutX + cutW) > iWidth) {
                cutW = iWidth - cutX;
            }
            if ((cutY + cutH) > iHeight) {
                cutH = iHeight - cutY;
            }
            //取消鼠标事件绑定
            document.querySelector('#zxxCropBox').onmousemove=null;
            document.querySelector('#zxxCropBox').onmouseup=null;
            document.querySelector('#zxxCropBox').onmousedown=null;            
            iWidth=cutW;
            iHeight=cutH;
            bCanvas.width=iWidth;
            bCanvas.height=iHeight;
            nCanvas.height = nCanvas.width * iHeight / iWidth;
            while(nCanvas.height>400){
                nCanvas.width*=0.8;
                nCanvas.height*=0.8;
            }
            bCtx = bCanvas.getContext('2d');
            bCtx.drawImage(image, cutX, cutY, cutW, cutH, 0, 0, cutW, cutH);
            image.src = bCanvas.toDataURL("image/png");  
            image.width=iWidth;
            image.height=iHeight; 
            setXY(0,0);         
            //裁剪完取消
            nocut();                 
        }

        //取消裁剪
        function nocut() {
            document.querySelector("#container").removeChild(oRelDiv);
            oRelDiv = null;
        }

        //恢复原图
        function ori() {
            var imageData = bCtx.getImageData(0, 0, bCanvas.width, bCanvas.height);
            var r={'data':new Uint8ClampedArray(imageData.data),'width':iWidth,'height':iHeight};
            undo_sta.push(r);
            iWidth = image_100.width;
            iHeight = image_100.height;      
            nCanvas.height = nCanvas.width * iHeight / iWidth;            
            var pre = document.querySelector('nCanvas');
            if (pre !== null) {
                navigator.removeChild(pre);
            }
            navigator.appendChild(nCanvas);
            bCanvas = document.querySelector("#iCanvas");
            bCanvas.width = iWidth;
            bCanvas.height = iHeight;
            bCtx = bCanvas.getContext('2d')
            var old=new Image();
            old.src=image_100.src;
            old.width=iWidth;
            old.height=iHeight;            
            bCtx.drawImage(old, 0, 0, iWidth, iHeight);
            image.width=bCanvas.width;
            image.height=bCanvas.height;
            image.src = bCanvas.toDataURL("image/png"); 
            scale = 1;
            setXY(0, 0)
        }

        //100%缩放
        function p100() {
            scale=1;
            setXY(0,0);
        }

        //获取某个像素属性
        function getPixes(x,y) {
            var idx=(parseInt(y)*iWidth+parseInt(x))*4;
            var imageData = bCtx.getImageData(0, 0, bCanvas.width, bCanvas.height);
            var res={'r':imageData.data[idx],'g':imageData.data[idx+1],'b':imageData.data[idx+2],'a':Number((imageData.data[idx+3] / 255).toFixed(2))};
            return res;
        }

        return {
            initial: initial,
            setImage: setImage,
            neg: neg,
            gray: gray,
            single: single,
            gaussBlur: gaussBlur,
            undo: undo,
            redo: redo,
            save: save,
            setDrag: setDrag,
            cut: cut,
            nocut: nocut,
            cutted: cutted,
            quit: quit,
            binary: binary,
            ori: ori,
            average: average,
            median: median,
            maxMin: maxMin,
            ripple: ripple,
            moir: moir,
            sculpture: sculpture,
            resize_nearest: resize_nearest,
            resize_bilinear: resize_bilinear,
            resize_bicubic:resize_bicubic,
            getImageSize: getImageSize,
            p100:p100,
            getPixes:getPixes,
            edge:edge,
            water:water,
            template:template,
        }
    }
;



