.class public Ljava/lang/InstantiationError;
.super Ljava/lang/IncompatibleClassChangeError;
.source "InstantiationError.java"


# direct methods
.method public constructor <init>()V
    .locals 2

    .prologue
    .line 5
    invoke-direct {p0}, Ljava/lang/IncompatibleClassChangeError;-><init>()V

    new-instance v0, Ljava/lang/RuntimeException;

    const-string v1, "Stub!"

    invoke-direct {v0, v1}, Ljava/lang/RuntimeException;-><init>(Ljava/lang/String;)V

    throw v0
.end method

.method public constructor <init>(Ljava/lang/String;)V
    .locals 2
    .param p1, "detailMessage"    # Ljava/lang/String;

    .prologue
    .line 6
    invoke-direct {p0}, Ljava/lang/IncompatibleClassChangeError;-><init>()V

    new-instance v0, Ljava/lang/RuntimeException;

    const-string v1, "Stub!"

    invoke-direct {v0, v1}, Ljava/lang/RuntimeException;-><init>(Ljava/lang/String;)V

    throw v0
.end method
