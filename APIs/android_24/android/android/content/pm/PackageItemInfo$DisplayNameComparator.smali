.class public Landroid/content/pm/PackageItemInfo$DisplayNameComparator;
.super Ljava/lang/Object;
.source "PackageItemInfo.java"

# interfaces
.implements Ljava/util/Comparator;


# annotations
.annotation system Ldalvik/annotation/EnclosingClass;
    value = Landroid/content/pm/PackageItemInfo;
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x9
    name = "DisplayNameComparator"
.end annotation

.annotation system Ldalvik/annotation/Signature;
    value = {
        "Ljava/lang/Object;",
        "Ljava/util/Comparator",
        "<",
        "Landroid/content/pm/PackageItemInfo;",
        ">;"
    }
.end annotation


# direct methods
.method public constructor <init>(Landroid/content/pm/PackageManager;)V
    .locals 2
    .param p1, "pm"    # Landroid/content/pm/PackageManager;

    .prologue
    .line 7
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    new-instance v0, Ljava/lang/RuntimeException;

    const-string v1, "Stub!"

    invoke-direct {v0, v1}, Ljava/lang/RuntimeException;-><init>(Ljava/lang/String;)V

    throw v0
.end method


# virtual methods
.method public final compare(Landroid/content/pm/PackageItemInfo;Landroid/content/pm/PackageItemInfo;)I
    .locals 2
    .param p1, "aa"    # Landroid/content/pm/PackageItemInfo;
    .param p2, "ab"    # Landroid/content/pm/PackageItemInfo;

    .prologue
    .line 8
    new-instance v0, Ljava/lang/RuntimeException;

    const-string v1, "Stub!"

    invoke-direct {v0, v1}, Ljava/lang/RuntimeException;-><init>(Ljava/lang/String;)V

    throw v0
.end method

.method public bridge synthetic compare(Ljava/lang/Object;Ljava/lang/Object;)I
    .locals 1
    .param p1, "x0"    # Ljava/lang/Object;
    .param p2, "x1"    # Ljava/lang/Object;

    .prologue
    .line 4
    check-cast p1, Landroid/content/pm/PackageItemInfo;

    .end local p1    # "x0":Ljava/lang/Object;
    check-cast p2, Landroid/content/pm/PackageItemInfo;

    .end local p2    # "x1":Ljava/lang/Object;
    invoke-virtual {p0, p1, p2}, Landroid/content/pm/PackageItemInfo$DisplayNameComparator;->compare(Landroid/content/pm/PackageItemInfo;Landroid/content/pm/PackageItemInfo;)I

    move-result v0

    return v0
.end method
