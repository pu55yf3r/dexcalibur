.class public Ljava/nio/charset/UnsupportedCharsetException;
.super Ljava/lang/IllegalArgumentException;
.source "UnsupportedCharsetException.java"


# direct methods
.method public constructor <init>(Ljava/lang/String;)V
    .locals 2
    .param p1, "charsetName"    # Ljava/lang/String;

    .prologue
    .line 5
    invoke-direct {p0}, Ljava/lang/IllegalArgumentException;-><init>()V

    new-instance v0, Ljava/lang/RuntimeException;

    const-string v1, "Stub!"

    invoke-direct {v0, v1}, Ljava/lang/RuntimeException;-><init>(Ljava/lang/String;)V

    throw v0
.end method


# virtual methods
.method public getCharsetName()Ljava/lang/String;
    .locals 2

    .prologue
    .line 6
    new-instance v0, Ljava/lang/RuntimeException;

    const-string v1, "Stub!"

    invoke-direct {v0, v1}, Ljava/lang/RuntimeException;-><init>(Ljava/lang/String;)V

    throw v0
.end method
