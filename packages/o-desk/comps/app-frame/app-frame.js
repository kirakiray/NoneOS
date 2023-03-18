Component(async () => {
  return {
    data: {
      sw: 500,
      sh: 400,
      x: 100,
      y: 100,
      isMax: false,
    },
    attrs: {
      src: "",
    },
    watch: {
      x() {
        this.renderBox();
      },
      y() {
        this.renderBox();
      },
      sw() {
        this.renderBox();
      },
      sh() {
        this.renderBox();
      },
    },
    proto: {
      focus() {
        this.parent.forEach((e) => e.blur());

        this.style.zIndex = 2;
      },
      blur() {
        this.style.zIndex = null;
      },
      moveStart(e) {
        const { pageX: p1x, pageY: p1y } = e;

        let diffX = 0,
          diffY = 0;

        this.showMask();
        this.focus();

        const moveId = $("body").on("mousemove", (e2) => {
          if (this.isMax) {
            this._oldBox.y = 0;
            if (e.clientX < innerWidth / 2) {
              this._oldBox.x = e.clientX / 2;
            } else {
              this._oldBox.x = e.clientX / 1.4;
            }
            this.switchMaximize();
          }

          const { pageX: p2x, pageY: p2y } = e2;

          diffX = p1x - p2x;
          diffY = p1y - p2y;

          this.style.left = this.x - diffX + "px";
          this.style.top = this.y - diffY + "px";
        });

        $("body").one("mouseup", (e2) => {
          console.log("mouseup2");
          $("body").off(moveId);
          this.x -= diffX;
          this.y -= diffY;
          this.hideMask();
        });
      },
      resizeStart(e) {
        const { pageX: p1x, pageY: p1y } = e;

        let diffX, diffY;

        this.showMask();

        const resizeId = $("body").on("mousemove", (e2) => {
          const { pageX: p2x, pageY: p2y } = e2;

          diffX = p1x - p2x;
          diffY = p1y - p2y;

          this.style.width = this.sw - diffX + "px";
          this.style.height = this.sh - diffY + "px";
        });

        $("body").one("mouseup", (e2) => {
          $("body").off(resizeId);
          this.sw -= diffX;
          this.sh -= diffY;
          this.hideMask();
        });
      },
      switchMaximize() {
        const maxSize = {
          x: 0,
          y: 0,
          sw: this.parent.width,
          sh: this.parent.height - 30,
        };

        const nowBox = {
          x: this.x,
          y: this.y,
          sw: this.sw,
          sh: this.sh,
        };

        if (!this.isMax) {
          Object.assign(this, maxSize);
          this._oldBox = nowBox;
          this.isMax = true;
        } else {
          this.isMax = false;
          if (this._oldBox) {
            Object.assign(this, this._oldBox);
          }
        }
      },
      renderBox() {
        Object.assign(this.style, {
          width: this.sw + "px",
          height: this.sh + "px",
          left: this.x + "px",
          top: this.y + "px",
        });
      },
      showMask(effectBrother = true) {
        this.shadow.$(".resize-mask").style.display = "";

        if (effectBrother) {
          this.parent.forEach((e) => {
            if (e !== this) {
              e.showMask(false);
            }
          });
        }
      },
      hideMask(effectBrother = true) {
        this.shadow.$(".resize-mask").style.display = "none";

        if (effectBrother) {
          this.parent.forEach((e) => {
            if (e !== this) {
              e.hideMask(false);
            }
          });
        }
      },
      tapClose() {
        this.remove();
      },
    },
    ready() {
      this.focus();
    },
  };
});
